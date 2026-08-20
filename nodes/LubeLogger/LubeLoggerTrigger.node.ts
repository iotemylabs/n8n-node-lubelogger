import type {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IPollFunctions,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import { getVehicleOptions, lubeLoggerApiRequest, normalizeOutputRecord } from './GenericFunctions';
import type { LubeLoggerRecordResource } from './types';
import { RECORD_ENDPOINTS } from './types';

/**
 * LubeLogger has no per-workflow webhook registration (its outgoing webhook is
 * a single server-wide URL set manually in Server Settings), so this trigger
 * polls the REST API and keeps watermarks in workflow static data. Vehicle
 * maintenance data changes daily at most - an hourly poll is plenty.
 */

const RECORD_TYPE_OPTIONS = [
	{ name: 'Fuel Record', value: 'gasRecord' },
	{ name: 'Odometer Record', value: 'odometerRecord' },
	{ name: 'Plan Record', value: 'planRecord' },
	{ name: 'Reminder', value: 'reminder' },
	{ name: 'Repair Record', value: 'repairRecord' },
	{ name: 'Service Record', value: 'serviceRecord' },
	{ name: 'Tax Record', value: 'taxRecord' },
	{ name: 'Upgrade Record', value: 'upgradeRecord' },
];

async function listRecords(
	context: IPollFunctions,
	resource: LubeLoggerRecordResource,
	vehicleId: number | undefined,
): Promise<IDataObject[]> {
	const { segment } = RECORD_ENDPOINTS[resource];
	const endpoint =
		vehicleId === undefined ? `/api/vehicle/${segment}/all` : `/api/vehicle/${segment}`;
	const qs: IDataObject = vehicleId === undefined ? {} : { vehicleId };
	const records = (await lubeLoggerApiRequest.call(context, 'GET', endpoint, undefined, qs)) as
		| IDataObject[]
		| null;
	return Array.isArray(records) ? records : [];
}

function getVehicleScope(context: IPollFunctions): number | undefined {
	const allVehicles = context.getNodeParameter('allVehicles', false) as boolean;
	if (allVehicles) return undefined;
	return context.getNodeParameter('vehicleId') as number;
}

export class LubeLoggerTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'LubeLogger Trigger',
		name: 'lubeLoggerTrigger',
		icon: { light: 'file:lubelogger.svg', dark: 'file:lubelogger.dark.svg' },
		group: ['trigger'],
		version: 1,
		subtitle: '={{$parameter["event"]}}',
		description:
			'Fire on LubeLogger changes. Polls the API - LubeLogger has no per-workflow webhooks - so pick a conservative interval; vehicle data rarely changes more than daily.',
		defaults: {
			name: 'LubeLogger Trigger',
		},
		polling: true,
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'lubeLoggerApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Event',
				name: 'event',
				type: 'options',
				options: [
					{
						name: 'New Record',
						value: 'newRecord',
						description: 'A new record of a chosen type was added',
					},
					{
						name: 'Odometer Threshold Crossed',
						value: 'odometerThreshold',
						description: "A vehicle's latest odometer reading passed a configured value",
					},
					{
						name: 'Plan Status Changed',
						value: 'planStatusChanged',
						description: 'A planner item moved to a different progress column',
					},
					{
						name: 'Reminder Due',
						value: 'reminderDue',
						description:
							'A reminder entered a chosen urgency state (as computed by LubeLogger). Fires once per transition, not on every poll while the reminder stays due.',
					},
				],
				default: 'reminderDue',
			},
			{
				displayName: 'All Vehicles',
				name: 'allVehicles',
				type: 'boolean',
				default: true,
				description: 'Whether to watch every vehicle in the garage or a single vehicle',
				displayOptions: {
					show: {
						event: ['reminderDue', 'newRecord', 'planStatusChanged'],
					},
				},
			},
			{
				displayName: 'Vehicle Name or ID',
				name: 'vehicleId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getVehicles',
				},
				default: '',
				required: true,
				description:
					'Vehicle to watch. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
				displayOptions: {
					show: {
						event: ['reminderDue', 'newRecord', 'planStatusChanged'],
						allVehicles: [false],
					},
				},
			},
			{
				displayName: 'Vehicle Name or ID',
				name: 'vehicleId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getVehicles',
				},
				default: '',
				required: true,
				description:
					'Vehicle whose odometer to watch. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
				displayOptions: {
					show: {
						event: ['odometerThreshold'],
					},
				},
			},
			{
				displayName: 'Urgencies to Fire On',
				name: 'urgencies',
				type: 'multiOptions',
				options: [
					{ name: 'Not Urgent', value: 'NotUrgent' },
					{ name: 'Past Due', value: 'PastDue' },
					{ name: 'Urgent', value: 'Urgent' },
					{ name: 'Very Urgent', value: 'VeryUrgent' },
				],
				default: ['Urgent', 'VeryUrgent', 'PastDue'],
				description:
					'Fire when a reminder enters one of these states. The Urgent/Very Urgent lead time (days and distance) is configured in LubeLogger itself, so adjust it there.',
				displayOptions: {
					show: {
						event: ['reminderDue'],
					},
				},
			},
			{
				displayName: 'Record Type',
				name: 'recordType',
				type: 'options',
				options: RECORD_TYPE_OPTIONS,
				default: 'gasRecord',
				description: 'Which record type to watch for new entries',
				displayOptions: {
					show: {
						event: ['newRecord'],
					},
				},
			},
			{
				displayName: 'Odometer Threshold',
				name: 'threshold',
				type: 'number',
				default: 0,
				required: true,
				description:
					"Fire once when the vehicle's latest reading reaches or passes this value. In the instance's configured unit - the node does not convert.",
				displayOptions: {
					show: {
						event: ['odometerThreshold'],
					},
				},
			},
		],
	};

	methods = {
		loadOptions: {
			getVehicles: getVehicleOptions,
		},
	};

	async poll(this: IPollFunctions): Promise<INodeExecutionData[][] | null> {
		const event = this.getNodeParameter('event') as string;
		const staticData = this.getWorkflowStaticData('node') as IDataObject;
		const isManual = this.getMode() === 'manual';
		const isFirstPoll = staticData.initializedFor !== event;

		let emitted: IDataObject[] = [];

		if (event === 'reminderDue') {
			const vehicleId = getVehicleScope(this);
			const selected = this.getNodeParameter('urgencies', ['Urgent', 'VeryUrgent', 'PastDue']) as string[];
			const reminders = await listRecords(this, 'reminder', vehicleId);
			const previousStates = (staticData.reminderStates ?? {}) as Record<string, string>;
			const nextStates: Record<string, string> = {};
			for (const record of reminders) {
				const id = String(record.id);
				const urgency = String(record.urgency ?? '');
				nextStates[id] = urgency;
				const wasInSet = id in previousStates && selected.includes(previousStates[id]);
				const isInSet = selected.includes(urgency);
				// Fire on transition into the selected set (including reminders that
				// appear already due), never while a reminder merely stays due.
				if (isInSet && !wasInSet && !isFirstPoll) {
					emitted.push(normalizeOutputRecord(record));
				}
			}
			staticData.reminderStates = nextStates;
			if (isManual) {
				emitted = reminders
					.filter((record) => selected.includes(String(record.urgency ?? '')))
					.map((record) => normalizeOutputRecord(record));
				if (emitted.length === 0 && reminders.length > 0) {
					emitted = [normalizeOutputRecord(reminders[0])];
				}
			}
		} else if (event === 'newRecord') {
			const vehicleId = getVehicleScope(this);
			const recordType = this.getNodeParameter('recordType') as LubeLoggerRecordResource;
			const records = await listRecords(this, recordType, vehicleId);
			const seenKey = `seenIds_${recordType}`;
			const seen = new Set((staticData[seenKey] ?? []) as string[]);
			for (const record of records) {
				const id = String(record.id);
				if (!seen.has(id)) {
					seen.add(id);
					if (!isFirstPoll) {
						emitted.push(normalizeOutputRecord(record));
					}
				}
			}
			staticData[seenKey] = [...seen];
			if (isManual && emitted.length === 0 && records.length > 0) {
				emitted = [normalizeOutputRecord(records[records.length - 1])];
			}
		} else if (event === 'odometerThreshold') {
			const vehicleId = this.getNodeParameter('vehicleId') as number;
			const threshold = this.getNodeParameter('threshold') as number;
			const odometer = (await lubeLoggerApiRequest.call(
				this,
				'GET',
				'/api/vehicle/odometerrecords/latest',
				undefined,
				{ vehicleId },
			)) as number;
			const previous = staticData.lastOdometer as number | undefined;
			// Baseline on the first observation; afterwards fire exactly once when
			// the reading moves from below the threshold to at-or-above it.
			const crossed = previous !== undefined && previous < threshold && odometer >= threshold;
			if (crossed && !isFirstPoll) {
				emitted = [{ vehicleId, odometer, threshold }];
			}
			if (isManual && emitted.length === 0) {
				emitted = [
					{
						vehicleId,
						odometer,
						threshold,
						note: odometer >= threshold ? 'Already past threshold' : 'Threshold not reached yet',
					},
				];
			}
			staticData.lastOdometer = odometer;
		} else if (event === 'planStatusChanged') {
			const vehicleId = getVehicleScope(this);
			const plans = await listRecords(this, 'planRecord', vehicleId);
			const previousStates = (staticData.planStates ?? {}) as Record<string, string>;
			const nextStates: Record<string, string> = {};
			for (const record of plans) {
				const id = String(record.id);
				const progress = String(record.progress ?? '');
				nextStates[id] = progress;
				if (!isFirstPoll && id in previousStates && previousStates[id] !== progress) {
					emitted.push({
						...normalizeOutputRecord(record),
						previousProgress: previousStates[id],
					});
				}
			}
			staticData.planStates = nextStates;
			if (isManual && emitted.length === 0 && plans.length > 0) {
				emitted = [normalizeOutputRecord(plans[0])];
			}
		} else {
			throw new NodeOperationError(this.getNode(), `Unknown event "${event}"`);
		}

		staticData.initializedFor = event;

		if (emitted.length === 0) {
			return null;
		}
		return [this.helpers.returnJsonArray(emitted)];
	}
}
