import type { INodeProperties } from 'n8n-workflow';

import {
	additionalFieldsCollection,
	allVehiclesToggle,
	asOptional,
	costField,
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

const fillToFullField: INodeProperties = {
	displayName: 'Filled to Full',
	name: 'isFillToFull',
	type: 'boolean',
	default: true,
	description:
		'Whether the tank was filled completely. LubeLogger computes fuel economy from the distance between full fill-ups: turn this off for a partial fill-up and the calculation is deferred and rolled into the next full one. A wrong value here misstates the computed economy of neighbouring records, not just this one.',
};

const missedFuelUpField: INodeProperties = {
	displayName: 'Missed Fuel-Up',
	name: 'missedFuelUp',
	type: 'boolean',
	default: false,
	description:
		'Whether a fill-up before this one was never recorded. Turning this on resets the economy calculation at this record so the gap does not corrupt the vehicle\'s averages. Leave off for a normal consecutive fill-up.',
};

const fuelConsumedDescription = `Amount of fuel added (or kWh charged for EVs). ${UNIT_NOTE}`;

const fuelConsumedField: INodeProperties = {
	displayName: 'Fuel Consumed',
	name: 'fuelConsumed',
	type: 'number',
	default: 0,
	required: true,
	description: fuelConsumedDescription,
};

const socOptions: INodeProperties[] = [
	{
		displayName: 'Starting State of Charge (EV)',
		name: 'startingSoc',
		type: 'number',
		default: 20,
		description:
			'Battery percentage before charging. Only meaningful for electric vehicles; LubeLogger defaults to 20 when omitted.',
	},
	{
		displayName: 'Ending State of Charge (EV)',
		name: 'endingSoc',
		type: 'number',
		default: 80,
		description:
			'Battery percentage after charging. Only meaningful for electric vehicles; LubeLogger defaults to 80 when omitted.',
	},
];

export const gasRecordProperties: INodeProperties[] = [
	recordOperations('gasRecord', 'fuel record', {
		deleteDescription:
			'Delete a fuel record. Irreversible, and because LubeLogger computes fuel economy from the record sequence, deleting one changes the computed economy of the neighbouring records.',
	}),
	...allVehiclesToggle('gasRecord'),
	vehicleSelector('gasRecord', ['create']),
	recordIdField('gasRecord', ['update', 'delete'], 'ID of the fuel record'),
	dateField('gasRecord', ['create'], 'Date of the fill-up'),
	odometerField(
		'gasRecord',
		['create'],
		'Fuel economy is computed from consecutive readings, so this must be the actual reading at the pump.',
	),
	{ ...fuelConsumedField, displayOptions: { show: { resource: ['gasRecord'], operation: ['create'] } } },
	costField('gasRecord', ['create'], 'Total cost of the fill-up in the instance currency'),
	{ ...fillToFullField, displayOptions: { show: { resource: ['gasRecord'], operation: ['create'] } } },
	{ ...missedFuelUpField, displayOptions: { show: { resource: ['gasRecord'], operation: ['create'] } } },
	additionalFieldsCollection('gasRecord', [
		...socOptions,
		extraFieldsOption,
		filesOption,
		notesOption,
		tagsOption,
	]),
	updateFieldsCollection('gasRecord', [
		asOptional(costField('gasRecord', [], 'Total cost of the fill-up in the instance currency')),
		asOptional(dateField('gasRecord', [], 'Date of the fill-up')),
		{ ...socOptions[1] },
		extraFieldsOption,
		fillToFullField,
		asOptional(fuelConsumedField),
		filesOption,
		missedFuelUpField,
		notesOption,
		asOptional(odometerField('gasRecord', [])),
		{ ...socOptions[0] },
		tagsOption,
	]),
	...returnAllAndLimit('gasRecord'),
	getAllFilters('gasRecord'),
];
