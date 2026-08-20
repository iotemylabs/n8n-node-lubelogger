import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestMethods,
	IHttpRequestOptions,
	ILoadOptionsFunctions,
	INodePropertyOptions,
	IPollFunctions,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';

import type { LubeLoggerOperationResponse, LubeLoggerRecordResource } from './types';
import { RECORD_ENDPOINTS } from './types';

type LubeLoggerContext = IExecuteFunctions | ILoadOptionsFunctions | IPollFunctions;

/**
 * All record dates travel as plain yyyy-MM-dd strings. LubeLogger parses input
 * dates with the server's culture, but ISO yyyy-MM-dd is unambiguous in every
 * .NET culture, and with the culture-invariant header (set in the credential)
 * responses come back as yyyy-MM-dd too.
 */
export function toApiDate(value: unknown, fieldName: string): string {
	if (value instanceof Date) {
		if (Number.isNaN(value.getTime())) {
			throw new Error(`"${fieldName}" is not a valid date`);
		}
		const month = String(value.getMonth() + 1).padStart(2, '0');
		const day = String(value.getDate()).padStart(2, '0');
		return `${value.getFullYear()}-${month}-${day}`;
	}
	if (value !== null && typeof value === 'object' && 'toISO' in value) {
		// Luxon DateTime from an n8n expression
		const iso = (value as { toISO: () => string | null }).toISO();
		if (iso) return iso.slice(0, 10);
	}
	if (typeof value === 'string' && value.trim() !== '') {
		const trimmed = value.trim();
		// Already ISO (with or without a time part): keep the date part verbatim
		// to avoid timezone shifts on date-only values.
		if (/^\d{4}-\d{2}-\d{2}([T ].*)?$/.test(trimmed)) {
			return trimmed.slice(0, 10);
		}
		const parsed = new Date(trimmed);
		if (!Number.isNaN(parsed.getTime())) {
			return toApiDate(parsed, fieldName);
		}
	}
	throw new Error(`"${fieldName}" is not a valid date: ${String(value)}`);
}

const DATE_OUTPUT_FIELDS = ['date', 'dueDate', 'dateCreated', 'dateModified', 'purchaseDate', 'soldDate'];

/**
 * Normalise a record for node output: LubeLogger uses 0001-01-01 (\.NET
 * default DateTime) as "no date", e.g. dueDate on odometer-only reminders.
 */
export function normalizeOutputRecord<T extends IDataObject>(record: T): T {
	for (const field of DATE_OUTPUT_FIELDS) {
		if (field in record && (record[field] === '0001-01-01' || record[field] === '')) {
			(record as IDataObject)[field] = null;
		}
	}
	return record;
}

async function getBaseUrl(context: LubeLoggerContext): Promise<string> {
	const credentials = await context.getCredentials('lubeLoggerApi');
	const raw = String(credentials.baseUrl ?? '').trim();
	const baseUrl = raw.replace(/\/+$/, '');
	if (baseUrl === '') {
		throw new NodeOperationError(context.getNode(), 'The LubeLogger credential has no Base URL');
	}
	if (/\/api$/i.test(baseUrl)) {
		throw new NodeOperationError(
			context.getNode(),
			'The Base URL in the LubeLogger credential must not include /api — use the instance root, e.g. http://192.168.1.100:8080',
		);
	}
	return baseUrl;
}

/**
 * Perform a request against the LubeLogger API. Auth headers, the
 * culture-invariant header and the SSL toggle are applied by the credential's
 * authenticate() hook. Responses are parsed here so that HTML error pages
 * (observed on bad credentials and misrouted proxies) produce a useful error
 * instead of a JSON parse failure.
 */
export async function lubeLoggerApiRequest(
	this: LubeLoggerContext,
	method: IHttpRequestMethods,
	endpoint: string,
	body?: IDataObject,
	qs?: IDataObject,
): Promise<unknown> {
	const baseUrl = await getBaseUrl(this);
	const options: IHttpRequestOptions = {
		method,
		url: `${baseUrl}${endpoint}`,
		qs,
		headers: {
			Accept: 'application/json',
			...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
		},
		body: body !== undefined ? JSON.stringify(body) : undefined,
		json: false,
		returnFullResponse: true,
		ignoreHttpStatusErrors: true,
	};

	const response = (await this.helpers.httpRequestWithAuthentication.call(
		this,
		'lubeLoggerApi',
		options,
	)) as { body: unknown; statusCode: number };

	const rawBody =
		typeof response.body === 'string'
			? response.body
			: Buffer.isBuffer(response.body)
				? response.body.toString('utf8')
				: JSON.stringify(response.body ?? '');

	let parsed: unknown;
	let parseFailed = false;
	if (rawBody.trim() === '') {
		parsed = null;
	} else {
		try {
			parsed = JSON.parse(rawBody);
		} catch {
			parseFailed = true;
		}
	}

	if (response.statusCode === 401) {
		throw new NodeApiError(this.getNode(), { message: 'Authorization failed' } as JsonObject, {
			httpCode: '401',
			message: 'LubeLogger rejected the credentials (401)',
			description:
				'Check the username and password — these are your LubeLogger login credentials — or the API key. Note that LubeLogger answers a bad API key with its HTML login page.',
		});
	}

	if (parseFailed) {
		throw new NodeApiError(this.getNode(), { message: rawBody.slice(0, 200) } as JsonObject, {
			httpCode: String(response.statusCode),
			message: 'LubeLogger returned a non-JSON response',
			description:
				'The server returned an HTML or text page rather than JSON. Check that the Base URL points at the LubeLogger root (without /api) and that any reverse proxy passes /api requests through unchanged.',
		});
	}

	const failure =
		parsed !== null &&
		typeof parsed === 'object' &&
		!Array.isArray(parsed) &&
		(parsed as LubeLoggerOperationResponse).success === false;

	if (response.statusCode >= 400 || failure) {
		const message =
			(failure && (parsed as LubeLoggerOperationResponse).message) ||
			`LubeLogger request failed with status ${response.statusCode}`;
		throw new NodeApiError(this.getNode(), (parsed ?? { message }) as JsonObject, {
			httpCode: String(response.statusCode),
			message,
		});
	}

	return parsed;
}

/** Flatten a mutation envelope into { success, message, ...additionalData }. */
export function formatMutationResult(response: unknown): IDataObject {
	const envelope = (response ?? {}) as LubeLoggerOperationResponse;
	return {
		success: envelope.success ?? true,
		message: envelope.message ?? '',
		...(envelope.additionalData ?? {}),
	};
}

/**
 * Fetch a single record by id via the whole-garage list endpoint, which
 * accepts an id filter without needing the vehicle id. Used for
 * read-merge-write updates: LubeLogger's update endpoints replace the whole
 * record, so omitted fields (extra fields, files, tags, notes) would
 * otherwise be silently wiped.
 */
export async function fetchRecordById(
	this: LubeLoggerContext,
	resource: LubeLoggerRecordResource,
	id: number,
): Promise<IDataObject> {
	const { segment } = RECORD_ENDPOINTS[resource];
	const records = (await lubeLoggerApiRequest.call(this, 'GET', `/api/vehicle/${segment}/all`, undefined, {
		id,
	})) as IDataObject[];
	if (!Array.isArray(records) || records.length === 0) {
		throw new NodeOperationError(this.getNode(), `No ${resource} with ID ${id} was found`);
	}
	return records[0];
}

/** Response-only fields that must not be sent back on update. */
const COMPUTED_FIELDS = ['fuelEconomy', 'urgency', 'userMetric', 'dueDays', 'dueDistance', 'vehicleId'];

/**
 * Merge user-supplied changes over the existing record for a full-replace
 * update. Only fields the user actually set are overwritten.
 */
export function mergeForUpdate(existing: IDataObject, updates: IDataObject): IDataObject {
	const merged: IDataObject = { ...existing };
	for (const field of COMPUTED_FIELDS) {
		delete merged[field];
	}
	for (const [key, value] of Object.entries(updates)) {
		if (value !== undefined) {
			merged[key] = value;
		}
	}
	// LubeLogger returns null for blanked notes but rejects null on input.
	if (merged.notes === null) {
		merged.notes = '';
	}
	return merged;
}

/**
 * Vehicle selector options, shared by the action node and the trigger.
 * Shows year/make/model plus the identifier, not a bare id.
 */
export async function getVehicleOptions(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const vehicles = (await lubeLoggerApiRequest.call(this, 'GET', '/api/vehicles')) as IDataObject[];
	if (!Array.isArray(vehicles)) {
		return [];
	}
	return vehicles
		.map((vehicle) => {
			const identifier = String(vehicle.licensePlate ?? '') || `#${vehicle.id}`;
			return {
				name: `${vehicle.year} ${vehicle.make} ${vehicle.model} (${identifier})`,
				value: vehicle.id as number,
			};
		})
		.sort((a, b) => a.name.localeCompare(b.name));
}
