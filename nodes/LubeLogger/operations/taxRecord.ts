import type { IDataObject, IExecuteFunctions } from 'n8n-workflow';

import { toApiDate } from '../GenericFunctions';
import type { RecordHandlers } from './record';
import { collectOptionalFields, recordCreate, recordDelete, recordGetAll, recordUpdate } from './record';

export const taxRecord: RecordHandlers = {
	async getAll(this: IExecuteFunctions, index: number) {
		return await recordGetAll.call(this, 'taxRecord', index);
	},
	async create(this: IExecuteFunctions, index: number) {
		const body: IDataObject = {
			date: toApiDate(this.getNodeParameter('date', index), 'Date'),
			description: this.getNodeParameter('description', index) as string,
			cost: this.getNodeParameter('cost', index) as number,
			...collectOptionalFields(this, index, 'additionalFields'),
		};
		return await recordCreate.call(this, 'taxRecord', index, body);
	},
	async update(this: IExecuteFunctions, index: number) {
		return await recordUpdate.call(this, 'taxRecord', index, collectOptionalFields(this, index, 'updateFields'));
	},
	async delete(this: IExecuteFunctions, index: number) {
		return await recordDelete.call(this, 'taxRecord', index);
	},
};
