import type { INodeProperties } from 'n8n-workflow';

import { makeGenericRecordProperties } from './shared';

export const upgradeRecordProperties: INodeProperties[] = makeGenericRecordProperties(
	'upgradeRecord',
	'upgrade record',
);
