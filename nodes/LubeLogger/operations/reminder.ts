import type { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { fetchRecordById, normalizeOutputRecord, toApiDate } from '../GenericFunctions';
import type { RecordHandlers } from './record';
import { collectOptionalFields, recordCreate, recordDelete, recordGetAll, recordUpdate } from './record';

export const reminder: RecordHandlers = {
	async getAll(this: IExecuteFunctions, index: number) {
		return await recordGetAll.call(this, 'reminder', index);
	},
	async get(this: IExecuteFunctions, index: number) {
		const recordId = this.getNodeParameter('recordId', index) as number;
		const record = await fetchRecordById.call(this, 'reminder', recordId);
		return normalizeOutputRecord(record);
	},
	async create(this: IExecuteFunctions, index: number) {
		const metric = this.getNodeParameter('metric', index) as string;
		const body: IDataObject = {
			description: this.getNodeParameter('description', index) as string,
			metric,
			...collectOptionalFields(this, index, 'additionalFields'),
		};
		if (metric === 'Date' || metric === 'Both') {
			const dueDate = this.getNodeParameter('dueDate', index, '') as string;
			if (dueDate === '') {
				throw new NodeOperationError(this.getNode(), 'Due Date is required when Metric is Date or Both', {
					itemIndex: index,
				});
			}
			body.dueDate = toApiDate(dueDate, 'Due Date');
		}
		if (metric === 'Odometer' || metric === 'Both') {
			body.dueOdometer = this.getNodeParameter('dueOdometer', index, 0) as number;
		}
		return await recordCreate.call(this, 'reminder', index, body);
	},
	async update(this: IExecuteFunctions, index: number) {
		return await recordUpdate.call(this, 'reminder', index, collectOptionalFields(this, index, 'updateFields'));
	},
	async delete(this: IExecuteFunctions, index: number) {
		return await recordDelete.call(this, 'reminder', index);
	},
};
