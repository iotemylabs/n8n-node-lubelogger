import type { IDataObject } from 'n8n-workflow';

/**
 * Wire shapes for LubeLogger v1.7.1, verified against a live instance
 * (docs/api-inventory.json). With the culture-invariant header, dates are
 * yyyy-MM-dd strings, numbers are JSON numbers and booleans are JSON booleans.
 */

export interface LubeLoggerExtraField extends IDataObject {
	name: string;
	value: string;
}

export interface LubeLoggerFile extends IDataObject {
	name: string;
	location: string;
}

/** Fields shared by every dated vehicle record type. */
export interface LubeLoggerRecordBase extends IDataObject {
	id?: number | string;
	vehicleId?: number | string;
	date?: string;
	notes?: string | null;
	tags?: string;
	extraFields?: LubeLoggerExtraField[];
	files?: LubeLoggerFile[];
}

/** Service, repair and upgrade records share this exact shape. */
export interface LubeLoggerGenericRecord extends LubeLoggerRecordBase {
	odometer?: number | string;
	description?: string;
	cost?: number | string;
}

export interface LubeLoggerTaxRecord extends LubeLoggerRecordBase {
	description?: string;
	cost?: number | string;
}

export interface LubeLoggerGasRecord extends LubeLoggerRecordBase {
	odometer?: number | string;
	fuelConsumed?: number | string;
	cost?: number | string;
	fuelEconomy?: number | string;
	isFillToFull?: boolean | string;
	missedFuelUp?: boolean | string;
	startingSoc?: number | string;
	endingSoc?: number | string;
}

export interface LubeLoggerOdometerRecord extends LubeLoggerRecordBase {
	initialOdometer?: number | string;
	odometer?: number | string;
	equipmentRecordId?: string;
}

export interface LubeLoggerReminder extends IDataObject {
	id?: number | string;
	vehicleId?: number | string;
	description?: string;
	urgency?: string;
	metric?: string;
	userMetric?: string;
	notes?: string | null;
	dueDate?: string | null;
	dueOdometer?: number | string;
	dueDays?: number | string;
	dueDistance?: number | string;
	tags?: string;
}

export interface LubeLoggerPlanRecord extends IDataObject {
	id?: number | string;
	vehicleId?: number | string;
	dateCreated?: string;
	dateModified?: string;
	description?: string;
	notes?: string | null;
	type?: string;
	priority?: string;
	progress?: string;
	cost?: number | string;
	extraFields?: LubeLoggerExtraField[];
	files?: LubeLoggerFile[];
}

/** Mutation envelope: { success, message, additionalData? } (verified live). */
export interface LubeLoggerOperationResponse extends IDataObject {
	success: boolean;
	message: string;
	additionalData?: IDataObject;
}

export type LubeLoggerRecordResource =
	| 'serviceRecord'
	| 'repairRecord'
	| 'upgradeRecord'
	| 'taxRecord'
	| 'gasRecord'
	| 'odometerRecord'
	| 'reminder'
	| 'planRecord';

export type LubeLoggerResource = LubeLoggerRecordResource | 'vehicle';

interface RecordEndpointConfig {
	/** Path segment: /api/vehicle/<segment>[/all|/add|/update|/delete] */
	segment: string;
	/** Whether the GET list supports startDate/endDate query filters. */
	dateFilters: boolean;
	/** Whether the GET list supports the tags query filter. */
	tagFilters: boolean;
}

export const RECORD_ENDPOINTS: Record<LubeLoggerRecordResource, RecordEndpointConfig> = {
	serviceRecord: { segment: 'servicerecords', dateFilters: true, tagFilters: true },
	repairRecord: { segment: 'repairrecords', dateFilters: true, tagFilters: true },
	upgradeRecord: { segment: 'upgraderecords', dateFilters: true, tagFilters: true },
	taxRecord: { segment: 'taxrecords', dateFilters: true, tagFilters: true },
	gasRecord: { segment: 'gasrecords', dateFilters: true, tagFilters: true },
	odometerRecord: { segment: 'odometerrecords', dateFilters: true, tagFilters: true },
	reminder: { segment: 'reminders', dateFilters: false, tagFilters: true },
	planRecord: { segment: 'planrecords', dateFilters: true, tagFilters: false },
};
