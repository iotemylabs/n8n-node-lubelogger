import type { INodeProperties } from 'n8n-workflow';

import {
	allVehiclesToggle,
	asOptional,
	descriptionField,
	getAllFilters,
	notesOption,
	recordIdField,
	recordOperations,
	returnAllAndLimit,
	tagsOption,
	UNIT_NOTE,
	updateFieldsCollection,
	vehicleSelector,
} from './shared';

const metricField: INodeProperties = {
	displayName: 'Metric',
	name: 'metric',
	type: 'options',
	options: [
		{
			name: 'Both',
			value: 'Both',
			description: 'Due at whichever of the date or the odometer threshold is reached first',
		},
		{ name: 'Date', value: 'Date', description: 'Due on a calendar date' },
		{ name: 'Odometer', value: 'Odometer', description: 'Due at an odometer reading' },
	],
	default: 'Date',
	description: 'What the reminder is tracked against',
};

const dueDateField: INodeProperties = {
	displayName: 'Due Date',
	name: 'dueDate',
	type: 'dateTime',
	default: '',
	description: 'Required when Metric is Date or Both',
};

const dueOdometerField: INodeProperties = {
	displayName: 'Due Odometer',
	name: 'dueOdometer',
	type: 'number',
	default: 0,
	description: `Odometer reading the reminder is due at. Required when Metric is Odometer or Both. ${UNIT_NOTE}`,
};

export const reminderProperties: INodeProperties[] = [
	recordOperations('reminder', 'reminder', {
		extraOperations: [
			{
				name: 'Get',
				value: 'get',
				description:
					'Get a single reminder with its computed urgency (NotUrgent, Urgent, VeryUrgent or PastDue)',
				action: 'Get a reminder',
			},
		],
	}),
	...allVehiclesToggle('reminder'),
	vehicleSelector('reminder', ['create']),
	recordIdField('reminder', ['get', 'update', 'delete'], 'ID of the reminder'),
	descriptionField('reminder', ['create'], 'What the reminder is for, e.g. "Oil change"'),
	{
		...metricField,
		required: true,
		displayOptions: { show: { resource: ['reminder'], operation: ['create'] } },
	},
	{
		...dueDateField,
		required: true,
		displayOptions: {
			show: { resource: ['reminder'], operation: ['create'], metric: ['Date', 'Both'] },
		},
	},
	{
		...dueOdometerField,
		required: true,
		displayOptions: {
			show: { resource: ['reminder'], operation: ['create'], metric: ['Odometer', 'Both'] },
		},
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		description:
			'Reminders created through the API are one-off; the recurring flag is only settable in the LubeLogger web UI',
		options: [notesOption, tagsOption],
		displayOptions: {
			show: {
				resource: ['reminder'],
				operation: ['create'],
			},
		},
	},
	updateFieldsCollection('reminder', [
		asOptional(descriptionField('reminder', [], 'What the reminder is for')),
		dueDateField,
		dueOdometerField,
		metricField,
		notesOption,
		tagsOption,
	]),
	...returnAllAndLimit('reminder'),
	getAllFilters('reminder'),
];
