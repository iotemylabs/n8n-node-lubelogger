import type { INodeProperties } from 'n8n-workflow';

import {
	additionalFieldsCollection,
	allVehiclesToggle,
	asOptional,
	dateField,
	extraFieldsOption,
	filesOption,
	getAllFilters,
	notesOption,
	odometerField,
	recordIdField,
	recordOperations,
	returnAllAndLimit,
	tagsOption,
	UNIT_NOTE,
	updateFieldsCollection,
	vehicleSelector,
} from './shared';

const initialOdometerOption: INodeProperties = {
	displayName: 'Initial Odometer',
	name: 'initialOdometer',
	type: 'number',
	default: 0,
	description: `Reading at the start of the span this record covers. If omitted on create, LubeLogger fills it with the previous record's reading. ${UNIT_NOTE}`,
};

export const odometerRecordProperties: INodeProperties[] = [
	recordOperations('odometerRecord', 'odometer record', {
		extraOperations: [
			{
				name: 'Get Latest',
				value: 'getLatest',
				description:
					"Get the vehicle's highest known odometer reading across all record types (a single number). Use it to fetch-then-write instead of hard-coding readings.",
				action: 'Get the latest odometer reading',
			},
		],
	}),
	...allVehiclesToggle('odometerRecord'),
	vehicleSelector('odometerRecord', ['create', 'getLatest']),
	recordIdField('odometerRecord', ['update', 'delete'], 'ID of the odometer record'),
	dateField('odometerRecord', ['create'], 'Date of the reading'),
	odometerField('odometerRecord', ['create']),
	additionalFieldsCollection('odometerRecord', [
		extraFieldsOption,
		filesOption,
		initialOdometerOption,
		notesOption,
		tagsOption,
	]),
	updateFieldsCollection('odometerRecord', [
		asOptional(dateField('odometerRecord', [], 'Date of the reading')),
		extraFieldsOption,
		filesOption,
		initialOdometerOption,
		notesOption,
		asOptional(odometerField('odometerRecord', [])),
		tagsOption,
	]),
	...returnAllAndLimit('odometerRecord'),
	getAllFilters('odometerRecord'),
];
