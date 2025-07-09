import dotenv from 'dotenv';
import fetch from 'node-fetch';
import * as https from 'https';

import { log } from './log';

dotenv.config({ path: '.env' });

class Sms {
	gatway: string;
	password: string;
	user: string;
	isSmsTools: boolean | null = null;
	enabled: boolean = false;
	selfSigned: boolean;
	token: string | null = null;

	private static instance: Sms;

	private constructor() {
		this.password = process.env.SMS_PASSWORD ?? '';
		this.user = process.env.SMS_USER ?? '';
		this.gatway = process.env.SMS_GATEWAY ?? '';
		//unactivate self-signed certificate by default if slef-signed is true
		this.selfSigned = process.env.SMS_SELFSIGNED === 'true' ? false : true;
		this.checkSmsTools()
			.then(isSmsTools => {
				this.isSmsTools = isSmsTools;
			})
			.catch(() => {
				this.isSmsTools = false;
			});
	}

	static getInstance(): Sms {
		if (!Sms.instance) {
			Sms.instance = new Sms();
		}
		return Sms.instance;
	}

	private async checkSmsTools(): Promise<boolean | null> {
		if (!this.gatway) {
			log(`[sms] Wrong gatway`, 'WARNING', __filename);
			this.enabled = false;
			return null;
		}
		const httpsAgent = new https.Agent({
			rejectUnauthorized: this.selfSigned
		});
		try {
			const res = await fetch(`${this.gatway}`, {
				method: 'GET',
				headers: {
					'Content-Type': 'application/json'
				},
				agent: httpsAgent
			});

			if (res && res.status === 200) {
				const text = await res.text();
				if (text === 'hello on sms-tools:api') {
					this.enabled = true;
					return true;
				} else {
					this.enabled = true;
					return false;
				}
			} else {
				this.enabled = false;
				return null;
			}
		} catch (err) {
			log(`[sms] Error fetching SMS gateway`, 'WARNING', __filename);
			this.enabled = false;
			return null;
		}
	}

	private async refreshToken(): Promise<void> {
		if (!this.gatway) {
			log(`[sms] Wrong gatway`, 'WARNING', __filename);
		}

		const httpsAgent = new https.Agent({
			rejectUnauthorized: this.selfSigned
		});

		const body = {
			phone: this.user,
			password: this.password
		};

		const res = await fetch(`${this.gatway}/login`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(body),
			agent: httpsAgent
		});

		if (res.status === 200) {
			const data = await res.json();
			this.token = data.token;
		} else {
			throw new Error('Failed to refresh token');
		}
	}

	async sendSms(
		data: Array<[string, string]>, // [name, phone][]
		message: string,
		createIfNotExist: boolean = true
	): Promise<any> {
		if (!this.gatway) {
			log(`[sms] Wrong gatway`, 'WARNING', __filename);
		}

		if (this.token === null) {
			await this.refreshToken();
		}

		if (!this.enabled) {
			throw new Error('SMS service is not enabled');
		}

		const httpsAgent = new https.Agent({
			rejectUnauthorized: this.selfSigned
		});

		const body = {
			message,
			data,
			createIfNotExist
		};

		const res = await fetch(`${this.gatway}/sendManySms`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${this.token}`
			},
			body: JSON.stringify(body),
			agent: httpsAgent
		});

		if (res.status === 200) {
			return res.body; // For SSE, you may want to handle the stream here
		} else {
			throw new Error(`Failed to send SMS: ${res.statusText}`);
		}
	}
}

export default Sms.getInstance();
