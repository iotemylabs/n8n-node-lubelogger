import type {
	IAuthenticate,
	ICredentialDataDecryptedObject,
	ICredentialTestRequest,
	ICredentialType,
	IHttpRequestOptions,
	Icon,
	INodeProperties,
} from 'n8n-workflow';

export class LubeLoggerApi implements ICredentialType {
	name = 'lubeLoggerApi';

	displayName = 'LubeLogger API';

	icon: Icon = 'file:../nodes/LubeLogger/lubelogger.svg';

	documentationUrl = 'https://docs.lubelogger.com/Advanced/API';

	properties: INodeProperties[] = [
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: '',
			placeholder: 'http://192.168.1.100:8080',
			required: true,
			description:
				'Root URL of your LubeLogger instance, without a trailing slash and without /api',
		},
		{
			displayName: 'Authentication',
			name: 'authType',
			type: 'options',
			options: [
				{
					name: 'API Key',
					value: 'apiKey',
					description:
						'Recommended. Generate one in LubeLogger under Settings. Keys can be scoped to Viewer (read only), Editor (read/add/edit), or Manager (read/add/edit/delete).',
				},
				{
					name: 'Basic Auth',
					value: 'basic',
					description:
						'Your LubeLogger login username and password. This grants full application access; prefer a scoped API key.',
				},
			],
			default: 'apiKey',
		},
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			displayOptions: {
				show: {
					authType: ['apiKey'],
				},
			},
		},
		{
			displayName: 'Username',
			name: 'username',
			type: 'string',
			default: '',
			description: 'Must not contain a colon (:). Single Sign-On accounts cannot use Basic auth; generate an API key instead.',
			displayOptions: {
				show: {
					authType: ['basic'],
				},
			},
		},
		{
			displayName: 'Password',
			name: 'password',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			description:
				'This is your LubeLogger account password and grants full application access',
			displayOptions: {
				show: {
					authType: ['basic'],
				},
			},
		},
		{
			displayName: 'Ignore SSL Issues (Insecure)',
			name: 'skipSslCertificateValidation',
			type: 'boolean',
			default: false,
			description:
				'Whether to connect even if SSL certificate validation fails, e.g. for a self-signed certificate',
		},
	];

	authenticate: IAuthenticate = async (
		credentials: ICredentialDataDecryptedObject,
		requestOptions: IHttpRequestOptions,
	): Promise<IHttpRequestOptions> => {
		const headers: Record<string, string> = {
			...(requestOptions.headers as Record<string, string> | undefined),
			// Presence of this header makes LubeLogger return dates as yyyy-MM-dd and
			// numbers/booleans as real JSON types instead of locale-formatted strings.
			'culture-invariant': 'true',
		};
		if (credentials.authType === 'basic') {
			const token = Buffer.from(`${credentials.username}:${credentials.password}`).toString(
				'base64',
			);
			headers.Authorization = `Basic ${token}`;
		} else {
			headers['x-api-key'] = credentials.apiKey as string;
		}
		return {
			...requestOptions,
			headers,
			skipSslCertificateValidation: credentials.skipSslCertificateValidation === true,
		};
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.baseUrl.replace(new RegExp("/+$"), "")}}',
			url: '/api/vehicles',
			method: 'GET',
		},
	};
}
