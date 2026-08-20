import { document } from './document';
import { gasRecord } from './gasRecord';
import { odometerRecord } from './odometerRecord';
import { planRecord } from './planRecord';
import type { RecordHandlers } from './record';
import { reminder } from './reminder';
import { repairRecord } from './repairRecord';
import { serviceRecord } from './serviceRecord';
import { taxRecord } from './taxRecord';
import { upgradeRecord } from './upgradeRecord';
import { vehicle } from './vehicle';

export const router: Record<string, RecordHandlers> = {
	document,
	gasRecord,
	odometerRecord,
	planRecord,
	reminder,
	repairRecord,
	serviceRecord,
	taxRecord,
	upgradeRecord,
	vehicle,
};
