import type { INodeProperties } from 'n8n-workflow';

import type { LubeLoggerRecordResource, LubeLoggerResource } from '../types';
import { RECORD_ENDPOINTS } from '../types';

/**
 * Shared field factories. The nine resources share most of their shape
 * (vehicle, date, odometer, cost, description, notes, tags, extra fields,
 * files), so the per-resource description files compose these instead of
 * repeating the same properties nine times. The resources stay separate in
 * the UI - users think "log a fill-up", not "create a record of type X".
 */

export const UNIT_NOTE =
	'Value is in the unit your LubeLogger instance is configured for (miles or kilometres, gallons or litres) - the node does not convert units.';

export function vehicleSelector(resource: LubeLoggerResource, operations: string[]): INodeProperties {
	return {
		displayName: 'Vehicle Name or ID',
		name: 'vehicleId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getVehicles',
		},
		default: '',
		required: true,
		description:
			'Vehicle this record belongs to. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		displayOptions: {
			show: {
				resource: [resource],
				operation: operations,
			},
		},
	};
}

export function allVehiclesToggle(resource: LubeLoggerRecordResource): INodeProperties[] {
	return [
		{
			displayName: 'All Vehicles',
			name: 'allVehicles',
			type: 'boolean',
			default: false,
			description: 'Whether to return records for every vehicle in the garage instead of one vehicle',
			displayOptions: {
				show: {
					resource: [resource],
					operation: ['getAll'],
				},
			},
		},
		{
			displayName: 'Vehicle Name or ID',
			name: 'vehicleId',
			type: 'options',
			typeOptions: {
				loadOptionsMethod: 'getVehicles',
			},
			default: '',
			required: true,
			description:
				'Vehicle to list records for. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			displayOptions: {
				show: {
					resource: [resource],
					operation: ['getAll'],
					allVehicles: [false],
				},
			},
		},
	];
}

export function recordIdField(
	resource: LubeLoggerRecordResource,
	operations: string[],
	description: string,
): INodeProperties {
	return {
		displayName: 'Record ID',
		name: 'recordId',
		type: 'number',
		default: 0,
		required: true,
		description,
		displayOptions: {
			show: {
				resource: [resource],
				operation: operations,
			},
		},
	};
}

export function returnAllAndLimit(resource: LubeLoggerRecordResource): INodeProperties[] {
	return [
		{
			displayName: 'Return All',
			name: 'returnAll',
			type: 'boolean',
			default: false,
			description: 'Whether to return all results or only up to a given limit',
			displayOptions: {
				show: {
					resource: [resource],
					operation: ['getAll'],
				},
			},
		},
		{
			displayName: 'Limit',
			name: 'limit',
			type: 'number',
			typeOptions: {
				minValue: 1,
			},
			default: 50,
			description: 'Max number of results to return',
			hint: 'The LubeLogger API has no pagination; the full list is fetched and truncated client-side',
			displayOptions: {
				show: {
					resource: [resource],
					operation: ['getAll'],
					returnAll: [false],
				},
			},
		},
	];
}

/** Filter collection for getAll, matching what the API actually supports per resource. */
export function getAllFilters(resource: LubeLoggerRecordResource): INodeProperties {
	const config = RECORD_ENDPOINTS[resource];
	const options: INodeProperties[] = [];
	if (config.dateFilters) {
		options.push(
			{
				displayName: 'Start Date',
				name: 'startDate',
				type: 'dateTime',
				default: '',
				description:
					resource === 'planRecord'
						? 'Only return plans created on or after this date'
						: 'Only return records dated on or after this date',
			},
			{
				displayName: 'End Date',
				name: 'endDate',
				type: 'dateTime',
				default: '',
				description:
					resource === 'planRecord'
						? 'Only return plans created on or before this date'
						: 'Only return records dated on or before this date',
			},
		);
	}
	if (config.tagFilters) {
		options.push({
			displayName: 'Tags',
			name: 'tags',
			type: 'string',
			default: '',
			description: 'Only return records carrying at least one of these tags (space-separated)',
		});
	}
	if (resource === 'gasRecord') {
		options.push(
			{
				displayName: 'Use MPG Calculation',
				name: 'useMPG',
				type: 'boolean',
				default: false,
				description:
					'Whether the returned fuel economy is calculated as distance per volume (e.g. MPG). When off, the instance computes volume per 100 distance units (e.g. L/100km).',
			},
			{
				displayName: 'Use UK MPG Calculation',
				name: 'useUKMPG',
				type: 'boolean',
				default: false,
				description: 'Whether to calculate fuel economy using imperial UK gallons',
			},
		);
	}
	if (resource === 'reminder') {
		options.push({
			displayName: 'Urgencies',
			name: 'urgencies',
			type: 'multiOptions',
			options: [
				{ name: 'Not Urgent', value: 'NotUrgent' },
				{ name: 'Past Due', value: 'PastDue' },
				{ name: 'Urgent', value: 'Urgent' },
				{ name: 'Very Urgent', value: 'VeryUrgent' },
			],
			default: [],
			description:
				'Only return reminders currently in these urgency states, as computed by LubeLogger from its configured thresholds. Leave empty for all.',
		});
	}
	return {
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		options,
		displayOptions: {
			show: {
				resource: [resource],
				operation: ['getAll'],
			},
		},
	};
}

export function dateField(
	resource: LubeLoggerRecordResource,
	operations: string[],
	description: string,
): INodeProperties {
	return {
		displayName: 'Date',
		name: 'date',
		type: 'dateTime',
		default: '',
		required: true,
		description,
		displayOptions: {
			show: {
				resource: [resource],
				operation: operations,
			},
		},
	};
}

export function odometerField(
	resource: LubeLoggerRecordResource,
	operations: string[],
	extraDescription = '',
): INodeProperties {
	return {
		displayName: 'Odometer',
		name: 'odometer',
		type: 'number',
		default: 0,
		required: true,
		description:
			`Odometer reading at the time of the record. ${UNIT_NOTE} Tip: the Odometer Record resource's "Get Latest" operation returns the vehicle's highest known reading, so workflows can fetch-then-write instead of hard-coding. ${extraDescription}`.trim(),
		displayOptions: {
			show: {
				resource: [resource],
				operation: operations,
			},
		},
	};
}

export function descriptionField(
	resource: LubeLoggerRecordResource,
	operations: string[],
	description: string,
): INodeProperties {
	return {
		displayName: 'Description',
		name: 'description',
		type: 'string',
		default: '',
		required: true,
		description,
		displayOptions: {
			show: {
				resource: [resource],
				operation: operations,
			},
		},
	};
}

export function costField(
	resource: LubeLoggerRecordResource,
	operations: string[],
	description: string,
): INodeProperties {
	return {
		displayName: 'Cost',
		name: 'cost',
		type: 'number',
		default: 0,
		required: true,
		description,
		displayOptions: {
			show: {
				resource: [resource],
				operation: operations,
			},
		},
	};
}

export const notesOption: INodeProperties = {
	displayName: 'Notes',
	name: 'notes',
	type: 'string',
	typeOptions: {
		rows: 2,
	},
	default: '',
	description: 'Free-form notes for the record',
};

export const tagsOption: INodeProperties = {
	displayName: 'Tags',
	name: 'tags',
	type: 'string',
	default: '',
	description: 'Space-separated tags, e.g. "diy warranty"',
};

export const extraFieldsOption: INodeProperties = {
	displayName: 'Extra Fields',
	name: 'extraFields',
	type: 'fixedCollection',
	typeOptions: {
		multipleValues: true,
	},
	placeholder: 'Add Extra Field',
	default: {},
	description:
		'User-defined extra fields configured in LubeLogger for this record type. On update, fields not listed here are preserved (the node re-reads the record and merges).',
	options: [
		{
			displayName: 'Field',
			name: 'field',
			values: [
				{
					displayName: 'Name',
					name: 'name',
					type: 'string',
					default: '',
					description: 'Name of the extra field as configured in LubeLogger',
				},
				{
					displayName: 'Value',
					name: 'value',
					type: 'string',
					default: '',
				},
			],
		},
	],
};

export const filesOption: INodeProperties = {
	displayName: 'Attached Files',
	name: 'files',
	type: 'fixedCollection',
	typeOptions: {
		multipleValues: true,
	},
	placeholder: 'Add File Reference',
	default: {},
	description:
		'File references to attach. Upload files first with the Document resource\'s Upload operation, then use the returned "location" here.',
	options: [
		{
			displayName: 'File',
			name: 'file',
			values: [
				{
					displayName: 'Name',
					name: 'name',
					type: 'string',
					default: '',
					description: 'Display name for the attachment',
				},
				{
					displayName: 'Location',
					name: 'location',
					type: 'string',
					default: '',
					description: 'Server-side location returned by the document upload operation',
				},
			],
		},
	],
};

/** Wrap options into the create-operation "Additional Fields" collection. */
export function additionalFieldsCollection(
	resource: LubeLoggerRecordResource,
	options: INodeProperties[],
): INodeProperties {
	return {
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		options,
		displayOptions: {
			show: {
				resource: [resource],
				operation: ['create'],
			},
		},
	};
}

/** Strip required/displayOptions so a top-level field can live inside a collection. */
export function asOptional(prop: INodeProperties): INodeProperties {
	const { required, displayOptions, ...rest } = prop;
	void required;
	void displayOptions;
	return rest as INodeProperties;
}

export function recordOperations(
	resource: LubeLoggerRecordResource,
	noun: string,
	overrides: {
		deleteDescription?: string;
		extraOperations?: Array<{ name: string; value: string; description: string; action: string }>;
	} = {},
): INodeProperties {
	const options = [
		{
			name: 'Create',
			value: 'create',
			description: `Create a ${noun}`,
			action: `Create a ${noun}`,
		},
		{
			name: 'Delete',
			value: 'delete',
			description:
				overrides.deleteDescription ?? `Delete a ${noun}. This is irreversible - there is no trash or undo in LubeLogger.`,
			action: `Delete a ${noun}`,
		},
		{
			name: 'Get Many',
			value: 'getAll',
			description: `List ${noun}s for a vehicle or the whole garage`,
			action: `Get many ${noun}s`,
		},
		{
			name: 'Update',
			value: 'update',
			description: `Update a ${noun}. Reads the existing record first so unspecified fields (extra fields, files, tags) are preserved.`,
			action: `Update a ${noun}`,
		},
		...(overrides.extraOperations ?? []),
	].sort((a, b) => a.name.localeCompare(b.name));
	return {
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: [resource],
			},
		},
		options,
		default: 'getAll',
	};
}

/**
 * Full property set for the three generic record types (service, repair,
 * upgrade), which share the exact same wire shape.
 */
export function makeGenericRecordProperties(
	resource: LubeLoggerRecordResource,
	noun: string,
): INodeProperties[] {
	return [
		recordOperations(resource, noun),
		...allVehiclesToggle(resource),
		vehicleSelector(resource, ['create']),
		recordIdField(resource, ['update', 'delete'], `ID of the ${noun}`),
		dateField(resource, ['create'], `Date the work was done. Sent to LubeLogger as a plain date (yyyy-MM-dd).`),
		odometerField(resource, ['create']),
		descriptionField(resource, ['create'], `Short description, e.g. "Oil change"`),
		costField(resource, ['create'], 'Total cost in the instance currency'),
		additionalFieldsCollection(resource, [extraFieldsOption, filesOption, notesOption, tagsOption]),
		updateFieldsCollection(resource, [
			asOptional(costField(resource, [], 'Total cost in the instance currency')),
			asOptional(dateField(resource, [], 'Date the work was done')),
			asOptional(descriptionField(resource, [], 'Short description')),
			extraFieldsOption,
			filesOption,
			notesOption,
			asOptional(odometerField(resource, [])),
			tagsOption,
		]),
		...returnAllAndLimit(resource),
		getAllFilters(resource),
	];
}

/**
 * Wrap options into the update-operation "Update Fields" collection. Updates
 * are read-merge-write: anything not set here keeps its current value.
 */
export function updateFieldsCollection(
	resource: LubeLoggerRecordResource,
	options: INodeProperties[],
): INodeProperties {
	return {
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		description:
			'Only the fields set here are changed; the node reads the existing record first and preserves everything else (including extra fields and attachments)',
		options,
		displayOptions: {
			show: {
				resource: [resource],
				operation: ['update'],
			},
		},
	};
}
