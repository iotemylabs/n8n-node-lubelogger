import type { IDataObject, IExecuteFunctions } from 'n8n-workflow';

import type { RecordHandlers } from './record';
import { collectOptionalFields, recordCreate, recordDelete, recordGetAll, recordUpdate } from './record';

export const planRecord: RecordHandlers = {
	async getAll(this: IExecuteFunctions, index: number) {
		return await recordGetAll.call(this, 'planRecord', index);
	},
	async create(this: IExecuteFunctions, index: number) {
		const body: IDataObject = {
			description: this.getNodeParameter('description', index) as string,
			cost: this.getNodeParameter('cost', index) as number,
			type: this.getNodeParameter('type', index) as string,
			priority: this.getNodeParameter('priority', index) as string,
			progress: this.getNodeParameter('progress', index) as string,
			...collectOptionalFields(this, index, 'additionalFields'),
		};
		return await recordCreate.call(this, 'planRecord', index, body);
	},
	async update(this: IExecuteFunctions, index: number) {
		return await recordUpdate.call(this, 'planRecord', index, collectOptionalFields(this, index, 'updateFields'));
	},
	async delete(this: IExecuteFunctions, index: number) {
		return await recordDelete.call(this, 'planRecord', index);
	},
};
