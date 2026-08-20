import type { INodeProperties } from 'n8n-workflow';

export const documentProperties: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['document'],
			},
		},
		options: [
			{
				name: 'Upload',
				value: 'upload',
				description:
					'Upload a file to LubeLogger. Returns a "location" you can pass in the Attached Files of any record create or update.',
				action: 'Upload a document',
			},
		],
		default: 'upload',
	},
	{
		displayName: 'Input Binary Field',
		name: 'binaryPropertyName',
		type: 'string',
		default: 'data',
		required: true,
		hint: 'The name of the input binary field containing the file to upload',
		displayOptions: {
			show: {
				resource: ['document'],
				operation: ['upload'],
			},
		},
	},
];
