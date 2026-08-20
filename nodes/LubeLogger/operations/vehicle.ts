import type { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import {
	formatMutationResult,
	lubeLoggerApiRequest,
	normalizeOutputRecord,
} from '../GenericFunctions';
import type { RecordHandlers } from './record';
import { collectOptionalFields } from './record';

async function fetchVehicleById(context: IExecuteFunctions, vehicleId: number): Promise<IDataObject> {
	const vehicles = (await lubeLoggerApiRequest.call(context, 'GET', '/api/vehicles')) as IDataObject[];
	const vehicle = (Array.isArray(vehicles) ? vehicles : []).find(
		(entry) => Number(entry.id) === vehicleId,
	);
	if (vehicle === undefined) {
		throw new NodeOperationError(context.getNode(), `No vehicle with ID ${vehicleId} was found`);
	}
	return vehicle;
}

/** Map the Vehicle entity returned by GET onto the import model expected by add/update. */
function vehicleEntityToImportModel(vehicle: IDataObject): IDataObject {
	return {
		id: vehicle.id,
		year: vehicle.year,
		make: vehicle.make,
		model: vehicle.model,
		licensePlate: vehicle.licensePlate,
		identifier: vehicle.vehicleIdentifier ?? 'LicensePlate',
		fuelType: vehicle.isElectric === true ? 'Electric' : vehicle.isDiesel === true ? 'Diesel' : 'Gasoline',
		useEngineHours: vehicle.useHours === true,
		odometerOptional: vehicle.odometerOptional === true,
		tags: Array.isArray(vehicle.tags) ? (vehicle.tags as string[]).join(' ') : (vehicle.tags ?? ''),
		extraFields: vehicle.extraFields ?? [],
	};
}

export const vehicle: RecordHandlers = {
	async getAll(this: IExecuteFunctions, index: number) {
		void index;
		const vehicles = (await lubeLoggerApiRequest.call(this, 'GET', '/api/vehicles')) as IDataObject[];
		return (Array.isArray(vehicles) ? vehicles : []).map((entry) => normalizeOutputRecord(entry));
	},
	async get(this: IExecuteFunctions, index: number) {
		const vehicleId = this.getNodeParameter('vehicleId', index) as number;
		return normalizeOutputRecord(await fetchVehicleById(this, vehicleId));
	},
	async getInfo(this: IExecuteFunctions, index: number) {
		const allVehicles = this.getNodeParameter('allVehicles', index, false) as boolean;
		const qs: IDataObject = {};
		if (!allVehicles) {
			qs.vehicleId = this.getNodeParameter('vehicleId', index) as number;
		}
		const info = (await lubeLoggerApiRequest.call(this, 'GET', '/api/vehicle/info', undefined, qs)) as IDataObject[];
		return Array.isArray(info) ? info : [];
	},
	async create(this: IExecuteFunctions, index: number) {
		const additionalFields = collectOptionalFields(this, index, 'additionalFields');
		const body: IDataObject = {
			year: this.getNodeParameter('year', index) as number,
			make: this.getNodeParameter('make', index) as string,
			model: this.getNodeParameter('model', index) as string,
			licensePlate: this.getNodeParameter('licensePlate', index) as string,
			fuelType: this.getNodeParameter('fuelType', index) as string,
			identifier: 'LicensePlate',
			...additionalFields,
		};
		const response = await lubeLoggerApiRequest.call(this, 'POST', '/api/vehicles/add', body);
		return formatMutationResult(response);
	},
	async update(this: IExecuteFunctions, index: number) {
		const vehicleId = this.getNodeParameter('vehicleId', index) as number;
		const updates = collectOptionalFields(this, index, 'updateFields');
		const existing = vehicleEntityToImportModel(await fetchVehicleById(this, vehicleId));
		const merged: IDataObject = { ...existing };
		for (const [key, value] of Object.entries(updates)) {
			if (value !== undefined) {
				merged[key] = value;
			}
		}
		merged.id = vehicleId;
		const response = await lubeLoggerApiRequest.call(this, 'PUT', '/api/vehicles/update', merged);
		return formatMutationResult(response);
	},
	async delete(this: IExecuteFunctions, index: number) {
		const vehicleId = this.getNodeParameter('vehicleId', index) as number;
		const response = await lubeLoggerApiRequest.call(this, 'DELETE', '/api/vehicles/delete', undefined, {
			id: vehicleId,
		});
		return formatMutationResult(response);
	},
};
