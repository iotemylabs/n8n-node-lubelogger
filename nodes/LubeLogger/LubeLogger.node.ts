import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import { allProperties } from './descriptions';
import { getVehicleOptions } from './GenericFunctions';
import { router } from './operations';

export class LubeLogger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'LubeLogger',
		name: 'lubeLogger',
		icon: { light: 'file:lubelogger.svg', dark: 'file:lubelogger.dark.svg' },
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description:
			'Manage vehicles, service and fuel records, odometer readings, reminders and planner items in LubeLogger',
		defaults: {
			name: 'LubeLogger',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'lubeLoggerApi',
				required: true,
			},
		],
		properties: allProperties,
	};

	methods = {
		loadOptions: {
			getVehicles: getVehicleOptions,
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		const handler = router[resource]?.[operation];
		if (handler === undefined) {
			throw new NodeOperationError(
				this.getNode(),
				`The operation "${operation}" is not supported for resource "${resource}"`,
			);
		}

		for (let index = 0; index < items.length; index++) {
			try {
				const result = await handler.call(this, index);
				const executionData = this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray(result),
					{ itemData: { item: index } },
				);
				returnData.push(...executionData);
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: { error: error instanceof Error ? error.message : String(error) },
						pairedItem: { item: index },
					});
					continue;
				}
				if (error instanceof NodeOperationError) {
					throw new NodeOperationError(this.getNode(), error, { itemIndex: index });
				}
				// NodeApiError instances pass through with message/description intact.
				throw new NodeApiError(this.getNode(), error as JsonObject, { itemIndex: index });
			}
		}
		return [returnData];
	}
}
