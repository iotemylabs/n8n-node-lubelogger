import type { INodeProperties } from 'n8n-workflow';

import { makeGenericRecordProperties } from './shared';

export const serviceRecordProperties: INodeProperties[] = makeGenericRecordProperties(
	'serviceRecord',
	'service record',
);
