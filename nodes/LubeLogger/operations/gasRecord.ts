import type { IDataObject, IExecuteFunctions } from 'n8n-workflow';

import { toApiDate } from '../GenericFunctions';
import type { RecordHandlers } from './record';
import { collectOptionalFields, recordCreate, recordDelete, recordGetAll, recordUpdate } from './record';

export const gasRecord: RecordHandlers = {
	async getAll(this: IExecuteFunctions, index: number) {
		return await recordGetAll.call(this, 'gasRecord', index);
	},
	async create(this: IExecuteFunctions, index: number) {
		const body: IDataObject = {
			date: toApiDate(this.getNodeParameter('date', index), 'Date'),
			odometer: this.getNodeParameter('odometer', index) as number,
			fuelConsumed: this.getNodeParameter('fuelConsumed', index) as number,
			cost: this.getNodeParameter('cost', index) as number,
			isFillToFull: this.getNodeParameter('isFillToFull', index) as boolean,
			missedFuelUp: this.getNodeParameter('missedFuelUp', index) as boolean,
			...collectOptionalFields(this, index, 'additionalFields'),
		};
		return await recordCreate.call(this, 'gasRecord', index, body);
	},
	async update(this: IExecuteFunctions, index: number) {
		return await recordUpdate.call(this, 'gasRecord', index, collectOptionalFields(this, index, 'updateFields'));
	},
	async delete(this: IExecuteFunctions, index: number) {
		return await recordDelete.call(this, 'gasRecord', index);
	},
};
