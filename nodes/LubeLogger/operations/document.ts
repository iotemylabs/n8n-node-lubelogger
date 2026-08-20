import type { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

import type { RecordHandlers } from './record';

export const document: RecordHandlers = {
	async upload(this: IExecuteFunctions, index: number) {
		const binaryPropertyName = this.getNodeParameter('binaryPropertyName', index) as string;
		const binaryData = this.helpers.assertBinaryData(index, binaryPropertyName);
		const buffer = await this.helpers.getBinaryDataBuffer(index, binaryPropertyName);

		const credentials = await this.getCredentials('lubeLoggerApi');
		const baseUrl = String(credentials.baseUrl ?? '')
			.trim()
			.replace(/\/+$/, '');

		const formData = new FormData();
		formData.append(
			'documents',
			new Blob([new Uint8Array(buffer)], { type: binaryData.mimeType || 'application/octet-stream' }),
			binaryData.fileName ?? 'upload',
		);

		let response: unknown;
		try {
			response = await this.helpers.httpRequestWithAuthentication.call(this, 'lubeLoggerApi', {
				method: 'POST',
				url: `${baseUrl}/api/documents/upload`,
				body: formData,
			});
		} catch (error) {
			throw new NodeApiError(this.getNode(), error as IDataObject as never, {
				message: 'Document upload failed',
				description:
					'Check the credentials and that the file is not empty. LubeLogger stores uploads under /documents/.',
			});
		}
		const parsed = typeof response === 'string' ? (JSON.parse(response) as unknown) : response;
		const uploads = Array.isArray(parsed) ? (parsed as IDataObject[]) : [parsed as IDataObject];
		return uploads;
	},
};
