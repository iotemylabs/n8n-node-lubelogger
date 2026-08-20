import type { INodeProperties } from 'n8n-workflow';

import {
	additionalFieldsCollection,
	allVehiclesToggle,
	asOptional,
	costField,
	descriptionField,
	extraFieldsOption,
	filesOption,
	getAllFilters,
	notesOption,
	recordIdField,
	recordOperations,
	returnAllAndLimit,
	updateFieldsCollection,
	vehicleSelector,
} from './shared';

const typeField: INodeProperties = {
	displayName: 'Type',
	name: 'type',
	type: 'options',
	options: [
		{ name: 'Repair Record', value: 'RepairRecord' },
		{ name: 'Service Record', value: 'ServiceRecord' },
		{ name: 'Upgrade Record', value: 'UpgradeRecord' },
	],
	default: 'ServiceRecord',
	description: 'Which record type the plan will become once completed',
};

const priorityField: INodeProperties = {
	displayName: 'Priority',
	name: 'priority',
	type: 'options',
	options: [
		{ name: 'Critical', value: 'Critical' },
		{ name: 'Low', value: 'Low' },
		{ name: 'Normal', value: 'Normal' },
	],
	default: 'Normal',
};

const progressField: INodeProperties = {
	displayName: 'Progress',
	name: 'progress',
	type: 'options',
	options: [
		{ name: 'Backlog', value: 'Backlog' },
		{ name: 'In Progress', value: 'InProgress' },
		{ name: 'Testing', value: 'Testing' },
	],
	default: 'Backlog',
	description:
		'Planner column. The LubeLogger API rejects "Done" - completing a plan (which converts it into a real record) can only be done in the web UI.',
};

export const planRecordProperties: INodeProperties[] = [
	recordOperations('planRecord', 'plan record'),
	...allVehiclesToggle('planRecord'),
	vehicleSelector('planRecord', ['create']),
	recordIdField('planRecord', ['update', 'delete'], 'ID of the plan record'),
	descriptionField('planRecord', ['create'], 'What is being planned, e.g. "Replace brake pads"'),
	costField('planRecord', ['create'], 'Estimated cost in the instance currency'),
	{
		...typeField,
		required: true,
		displayOptions: { show: { resource: ['planRecord'], operation: ['create'] } },
	},
	{
		...priorityField,
		required: true,
		displayOptions: { show: { resource: ['planRecord'], operation: ['create'] } },
	},
	{
		...progressField,
		required: true,
		displayOptions: { show: { resource: ['planRecord'], operation: ['create'] } },
	},
	additionalFieldsCollection('planRecord', [extraFieldsOption, filesOption, notesOption]),
	updateFieldsCollection('planRecord', [
		asOptional(costField('planRecord', [], 'Estimated cost in the instance currency')),
		asOptional(descriptionField('planRecord', [], 'What is being planned')),
		extraFieldsOption,
		filesOption,
		notesOption,
		priorityField,
		progressField,
		typeField,
	]),
	...returnAllAndLimit('planRecord'),
	getAllFilters('planRecord'),
];
