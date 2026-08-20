import type { IDataObject, IExecuteFunctions } from 'n8n-workflow';

import { lubeLoggerApiRequest, toApiDate } from '../GenericFunctions';
import type { RecordHandlers } from './record';
import { collectOptionalFields, recordCreate, recordDelete, recordGetAll, recordUpdate } from './record';

export const odometerRecord: RecordHandlers = {
	async getAll(this: IExecuteFunctions, index: number) {
		return await recordGetAll.call(this, 'odometerRecord', index);
	},
	async getLatest(this: IExecuteFunctions, index: number) {
		const vehicleId = this.getNodeParameter('vehicleId', index) as number;
		const odometer = (await lubeLoggerApiRequest.call(
			this,
			'GET',
			'/api/vehicle/odometerrecords/latest',
			undefined,
			{ vehicleId },
		)) as number;
		return { vehicleId, odometer };
	},
	async create(this: IExecuteFunctions, index: number) {
		const body: IDataObject = {
			date: toApiDate(this.getNodeParameter('date', index), 'Date'),
			odometer: this.getNodeParameter('odometer', index) as number,
			...collectOptionalFields(this, index, 'additionalFields'),
		};
		return await recordCreate.call(this, 'odometerRecord', index, body);
	},
	async update(this: IExecuteFunctions, index: number) {
		return await recordUpdate.call(this, 'odometerRecord', index, collectOptionalFields(this, index, 'updateFields'));
	},
	async delete(this: IExecuteFunctions, index: number) {
		return await recordDelete.call(this, 'odometerRecord', index);
	},
};
