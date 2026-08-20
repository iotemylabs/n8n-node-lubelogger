import type { INodeProperties } from 'n8n-workflow';

import { makeGenericRecordProperties } from './shared';

export const repairRecordProperties: INodeProperties[] = makeGenericRecordProperties(
	'repairRecord',
	'repair record',
);
