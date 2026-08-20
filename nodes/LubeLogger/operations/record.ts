import type { IDataObject, IExecuteFunctions } from 'n8n-workflow';

import {
	fetchRecordById,
	formatMutationResult,
	lubeLoggerApiRequest,
	mergeForUpdate,
	normalizeOutputRecord,
	toApiDate,
} from '../GenericFunctions';
import type { LubeLoggerRecordResource } from '../types';
import { RECORD_ENDPOINTS } from '../types';

/**
 * Shared implementations for the record resources. Each resource keeps its
 * own UI and its own body-builder; only the HTTP mechanics are shared.
 */

interface FixedCollectionEntry {
	name?: string;
	value?: string;
	location?: string;
}

/** Convert the fixedCollection wire format into API arrays. */
function unpackCollections(fields: IDataObject): IDataObject {
	const result: IDataObject = { ...fields };
	const extraFields = (fields.extraFields as IDataObject | undefined)?.field as
		| FixedCollectionEntry[]
		| undefined;
	if (extraFields !== undefined) {
		result.extraFields = extraFields.map((entry) => ({
			name: entry.name ?? '',
			value: entry.value ?? '',
		}));
	}
	const files = (fields.files as IDataObject | undefined)?.file as
		| FixedCollectionEntry[]
		| undefined;
	if (files !== undefined) {
		result.files = files.map((entry) => ({
			name: entry.name ?? '',
			location: entry.location ?? '',
		}));
	}
	return result;
}

/** Normalise optional/update fields shared across record types. */
export function collectOptionalFields(
	context: IExecuteFunctions,
	index: number,
	parameterName: 'additionalFields' | 'updateFields',
): IDataObject {
	const raw = context.getNodeParameter(parameterName, index, {}) as IDataObject;
	const fields = unpackCollections(raw);
	if (typeof fields.date === 'string' && fields.date !== '') {
		fields.date = toApiDate(fields.date, 'Date');
	}
	if (typeof fields.dueDate === 'string' && fields.dueDate !== '') {
		fields.dueDate = toApiDate(fields.dueDate, 'Due Date');
	}
	return fields;
}

export async function recordGetAll(
	this: IExecuteFunctions,
	resource: LubeLoggerRecordResource,
	index: number,
): Promise<IDataObject[]> {
	const { segment } = RECORD_ENDPOINTS[resource];
	const allVehicles = this.getNodeParameter('allVehicles', index, false) as boolean;
	const filters = this.getNodeParameter('filters', index, {}) as IDataObject;
	const qs: IDataObject = {};
	if (typeof filters.startDate === 'string' && filters.startDate !== '') {
		qs.startDate = toApiDate(filters.startDate, 'Start Date');
	}
	if (typeof filters.endDate === 'string' && filters.endDate !== '') {
		qs.endDate = toApiDate(filters.endDate, 'End Date');
	}
	if (typeof filters.tags === 'string' && filters.tags !== '') {
		qs.tags = filters.tags;
	}
	if (filters.useMPG === true) {
		qs.useMPG = 'true';
	}
	if (filters.useUKMPG === true) {
		qs.useUKMPG = 'true';
	}
	let endpoint: string;
	if (allVehicles) {
		endpoint = `/api/vehicle/${segment}/all`;
	} else {
		endpoint = `/api/vehicle/${segment}`;
		qs.vehicleId = this.getNodeParameter('vehicleId', index) as number;
	}
	if (Array.isArray(filters.urgencies) && filters.urgencies.length > 0) {
		// ASP.NET binds List<> query params as repeated keys, not comma-separated.
		const query = (filters.urgencies as string[])
			.map((urgency) => `urgencies=${encodeURIComponent(urgency)}`)
			.join('&');
		endpoint = `${endpoint}?${query}`;
	}

	let records = (await lubeLoggerApiRequest.call(this, 'GET', endpoint, undefined, qs)) as
		| IDataObject[]
		| null;
	if (!Array.isArray(records)) {
		records = [];
	}
	const returnAll = this.getNodeParameter('returnAll', index, false) as boolean;
	if (!returnAll) {
		const limit = this.getNodeParameter('limit', index, 50) as number;
		records = records.slice(0, limit);
	}
	return records.map((record) => normalizeOutputRecord(record));
}

export async function recordCreate(
	this: IExecuteFunctions,
	resource: LubeLoggerRecordResource,
	index: number,
	body: IDataObject,
	qs: IDataObject = {},
): Promise<IDataObject> {
	const { segment } = RECORD_ENDPOINTS[resource];
	const vehicleId = this.getNodeParameter('vehicleId', index) as number;
	const response = await lubeLoggerApiRequest.call(
		this,
		'POST',
		`/api/vehicle/${segment}/add`,
		body,
		{ vehicleId, ...qs },
	);
	return formatMutationResult(response);
}

export async function recordUpdate(
	this: IExecuteFunctions,
	resource: LubeLoggerRecordResource,
	index: number,
	updates: IDataObject,
): Promise<IDataObject> {
	const { segment } = RECORD_ENDPOINTS[resource];
	const recordId = this.getNodeParameter('recordId', index) as number;
	const existing = await fetchRecordById.call(this, resource, recordId);
	const merged = mergeForUpdate(existing, updates);
	merged.id = recordId;
	const response = await lubeLoggerApiRequest.call(
		this,
		'PUT',
		`/api/vehicle/${segment}/update`,
		merged,
	);
	return formatMutationResult(response);
}

export type RecordHandlers = Record<
	string,
	(this: IExecuteFunctions, index: number) => Promise<IDataObject | IDataObject[]>
>;

/**
 * Handler set for the three generic record types (service, repair, upgrade),
 * which share the exact same wire shape and required fields.
 */
export function makeGenericRecordHandlers(resource: LubeLoggerRecordResource): RecordHandlers {
	return {
		async getAll(this: IExecuteFunctions, index: number) {
			return await recordGetAll.call(this, resource, index);
		},
		async create(this: IExecuteFunctions, index: number) {
			const body: IDataObject = {
				date: toApiDate(this.getNodeParameter('date', index), 'Date'),
				odometer: this.getNodeParameter('odometer', index) as number,
				description: this.getNodeParameter('description', index) as string,
				cost: this.getNodeParameter('cost', index) as number,
				...collectOptionalFields(this, index, 'additionalFields'),
			};
			return await recordCreate.call(this, resource, index, body);
		},
		async update(this: IExecuteFunctions, index: number) {
			return await recordUpdate.call(this, resource, index, collectOptionalFields(this, index, 'updateFields'));
		},
		async delete(this: IExecuteFunctions, index: number) {
			return await recordDelete.call(this, resource, index);
		},
	};
}

export async function recordDelete(
	this: IExecuteFunctions,
	resource: LubeLoggerRecordResource,
	index: number,
): Promise<IDataObject> {
	const { segment } = RECORD_ENDPOINTS[resource];
	const recordId = this.getNodeParameter('recordId', index) as number;
	const response = await lubeLoggerApiRequest.call(
		this,
		'DELETE',
		`/api/vehicle/${segment}/delete`,
		undefined,
		{ id: recordId },
	);
	return formatMutationResult(response);
}
