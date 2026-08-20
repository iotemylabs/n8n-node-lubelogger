import type { INodeProperties } from 'n8n-workflow';

import {
	additionalFieldsCollection,
	allVehiclesToggle,
	asOptional,
	costField,
	dateField,
	descriptionField,
	extraFieldsOption,
	filesOption,
	getAllFilters,
	notesOption,
	recordIdField,
	recordOperations,
	returnAllAndLimit,
	tagsOption,
	updateFieldsCollection,
	vehicleSelector,
} from './shared';

/** Tax records are the generic record shape without an odometer field. */
export const taxRecordProperties: INodeProperties[] = [
	recordOperations('taxRecord', 'tax record'),
	...allVehiclesToggle('taxRecord'),
	vehicleSelector('taxRecord', ['create']),
	recordIdField('taxRecord', ['update', 'delete'], 'ID of the tax record'),
	dateField('taxRecord', ['create'], 'Date the tax or fee was paid'),
	descriptionField('taxRecord', ['create'], 'Short description, e.g. "Registration renewal"'),
	costField('taxRecord', ['create'], 'Amount paid in the instance currency'),
	additionalFieldsCollection('taxRecord', [extraFieldsOption, filesOption, notesOption, tagsOption]),
	updateFieldsCollection('taxRecord', [
		asOptional(costField('taxRecord', [], 'Amount paid in the instance currency')),
		asOptional(dateField('taxRecord', [], 'Date the tax or fee was paid')),
		asOptional(descriptionField('taxRecord', [], 'Short description')),
		extraFieldsOption,
		filesOption,
		notesOption,
		tagsOption,
	]),
	...returnAllAndLimit('taxRecord'),
	getAllFilters('taxRecord'),
];
