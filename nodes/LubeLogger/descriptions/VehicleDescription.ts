import type { INodeProperties } from 'n8n-workflow';

import { extraFieldsOption, tagsOption } from './shared';

const vehicleIdSelector = (operations: string[], description: string): INodeProperties => ({
	displayName: 'Vehicle Name or ID',
	name: 'vehicleId',
	type: 'options',
	typeOptions: {
		loadOptionsMethod: 'getVehicles',
	},
	default: '',
	required: true,
	description: `${description}. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.`,
	displayOptions: {
		show: {
			resource: ['vehicle'],
			operation: operations,
		},
	},
});

const fuelTypeField: INodeProperties = {
	displayName: 'Fuel Type',
	name: 'fuelType',
	type: 'options',
	options: [
		{ name: 'Diesel', value: 'Diesel' },
		{ name: 'Electric', value: 'Electric' },
		{ name: 'Gasoline', value: 'Gasoline' },
	],
	default: 'Gasoline',
	description:
		'Note: the LubeLogger API can change a vehicle from Gasoline to Diesel or Electric on update, but not back to Gasoline - that requires the web UI',
};

const vehicleSharedOptions: INodeProperties[] = [
	extraFieldsOption,
	{
		displayName: 'License Plate',
		name: 'licensePlate',
		type: 'string',
		default: '',
		description: 'Required when Identifier is "LicensePlate" (the default)',
	},
	{
		displayName: 'Identifier',
		name: 'identifier',
		type: 'string',
		default: 'LicensePlate',
		description:
			'Which field identifies the vehicle in the UI. Either "LicensePlate" or the name of an extra field (e.g. "VIN") whose value must then be present in Extra Fields.',
	},
	{
		displayName: 'Odometer Optional',
		name: 'odometerOptional',
		type: 'boolean',
		default: false,
		description: 'Whether odometer readings are optional for this vehicle',
	},
	tagsOption,
	{
		displayName: 'Use Engine Hours',
		name: 'useEngineHours',
		type: 'boolean',
		default: false,
		description: 'Whether the vehicle tracks engine hours instead of distance',
	},
];

export const vehicleProperties: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['vehicle'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Add a vehicle to the garage',
				action: 'Create a vehicle',
			},
			{
				name: 'Delete',
				value: 'delete',
				description:
					'Delete a vehicle AND every record attached to it (service, fuel, odometer, reminders, ...). Irreversible.',
				action: 'Delete a vehicle',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a single vehicle',
				action: 'Get a vehicle',
			},
			{
				name: 'Get Info',
				value: 'getInfo',
				description:
					'Get aggregate statistics: record counts and costs per type, reminder counts by urgency, next reminder, last reported odometer, plan progress counts',
				action: 'Get vehicle statistics',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'List many vehicles in the garage',
				action: 'Get many vehicles',
			},
			{
				name: 'Update',
				value: 'update',
				description:
					'Update a vehicle. Reads the existing vehicle first so unspecified fields (extra fields, tags) are preserved.',
				action: 'Update a vehicle',
			},
		],
		default: 'getAll',
	},
	vehicleIdSelector(['get', 'update', 'delete'], 'Vehicle to operate on'),
	{
		displayName: 'All Vehicles',
		name: 'allVehicles',
		type: 'boolean',
		default: false,
		description: 'Whether to return statistics for every vehicle instead of one',
		displayOptions: {
			show: {
				resource: ['vehicle'],
				operation: ['getInfo'],
			},
		},
	},
	{
		...vehicleIdSelector(['getInfo'], 'Vehicle to get statistics for'),
		displayOptions: {
			show: {
				resource: ['vehicle'],
				operation: ['getInfo'],
				allVehicles: [false],
			},
		},
	},
	{
		displayName: 'Year',
		name: 'year',
		type: 'number',
		default: 2020,
		required: true,
		displayOptions: { show: { resource: ['vehicle'], operation: ['create'] } },
	},
	{
		displayName: 'Make',
		name: 'make',
		type: 'string',
		default: '',
		required: true,
		placeholder: 'e.g. Toyota',
		displayOptions: { show: { resource: ['vehicle'], operation: ['create'] } },
	},
	{
		displayName: 'Model',
		name: 'model',
		type: 'string',
		default: '',
		required: true,
		placeholder: 'e.g. Corolla',
		displayOptions: { show: { resource: ['vehicle'], operation: ['create'] } },
	},
	{
		displayName: 'License Plate',
		name: 'licensePlate',
		type: 'string',
		default: '',
		required: true,
		description:
			'Required with the default "LicensePlate" identifier. To identify the vehicle by an extra field instead, set Identifier in Additional Fields.',
		displayOptions: { show: { resource: ['vehicle'], operation: ['create'] } },
	},
	{
		...fuelTypeField,
		required: true,
		displayOptions: { show: { resource: ['vehicle'], operation: ['create'] } },
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		options: vehicleSharedOptions.filter((option) => option.name !== 'licensePlate'),
		displayOptions: {
			show: {
				resource: ['vehicle'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		description:
			'Only the fields set here are changed; the node reads the existing vehicle first and preserves everything else',
		options: [
			fuelTypeField,
			{ displayName: 'Make', name: 'make', type: 'string', default: '' },
			{ displayName: 'Model', name: 'model', type: 'string', default: '' },
			{ displayName: 'Year', name: 'year', type: 'number', default: 2020 },
			...vehicleSharedOptions,
		],
		displayOptions: {
			show: {
				resource: ['vehicle'],
				operation: ['update'],
			},
		},
	},
];
