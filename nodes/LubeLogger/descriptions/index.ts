import type { INodeProperties } from 'n8n-workflow';

import { documentProperties } from './DocumentDescription';
import { gasRecordProperties } from './GasRecordDescription';
import { odometerRecordProperties } from './OdometerRecordDescription';
import { planRecordProperties } from './PlanRecordDescription';
import { reminderProperties } from './ReminderDescription';
import { repairRecordProperties } from './RepairRecordDescription';
import { serviceRecordProperties } from './ServiceRecordDescription';
import { taxRecordProperties } from './TaxRecordDescription';
import { upgradeRecordProperties } from './UpgradeRecordDescription';
import { vehicleProperties } from './VehicleDescription';

export const resourceSelector: INodeProperties = {
	displayName: 'Resource',
	name: 'resource',
	type: 'options',
	noDataExpression: true,
	options: [
		{ name: 'Document', value: 'document' },
		{ name: 'Fuel Record', value: 'gasRecord' },
		{ name: 'Odometer Record', value: 'odometerRecord' },
		{ name: 'Plan Record', value: 'planRecord' },
		{ name: 'Reminder', value: 'reminder' },
		{ name: 'Repair Record', value: 'repairRecord' },
		{ name: 'Service Record', value: 'serviceRecord' },
		{ name: 'Tax Record', value: 'taxRecord' },
		{ name: 'Upgrade Record', value: 'upgradeRecord' },
		{ name: 'Vehicle', value: 'vehicle' },
	],
	default: 'vehicle',
};

export const allProperties: INodeProperties[] = [
	resourceSelector,
	...vehicleProperties,
	...serviceRecordProperties,
	...repairRecordProperties,
	...upgradeRecordProperties,
	...taxRecordProperties,
	...gasRecordProperties,
	...odometerRecordProperties,
	...reminderProperties,
	...planRecordProperties,
	...documentProperties,
];
