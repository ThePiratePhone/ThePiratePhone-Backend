import { Request, Response } from 'express';
import { Client } from '../Models/Client';
import { Log } from '../tools/log';
import phoneNumberCheck from '../tools/phoneNumberCheck';

export default async function NewClient(req: Request<any>, res: Response<any>) {
	if (!req.body || req.body.name == null || req.body.phone == null || req.body.adminCode == null) {
		Log('Missing parameters from ' + req.socket?.remoteAddress?.split(':').pop(), 'WARNING', 'NewClient.ts');
		res.status(400).send({ message: 'Missing parameters', OK: false });
		return;
	}

	if (
		req.body.name == '' ||
		typeof req.body.name != 'string' ||
		req.body.phone == '' ||
		typeof req.body.phone != 'string' ||
		req.body.adminCode == ''
	) {
		Log('Invalid parameters from ' + req.socket?.remoteAddress?.split(':').pop(), 'WARNING', 'NewClient.ts');
		res.status(400).send({ message: 'Invalid parameters', OK: false });
		return;
	}

	if (req.body.adminCode !== process.env.ADMIN_PASSWORD) {
		Log('Invalid admin code from ' + req.socket?.remoteAddress?.split(':').pop(), 'WARNING', 'NewClient.ts');
		res.status(400).send({ message: 'Invalid admin code', OK: false });
		return;
	}

	if (phoneNumberCheck(req.body.phone) == false) {
		Log('Invalid phone number from ' + req.socket?.remoteAddress?.split(':').pop(), 'WARNING', 'NewClient.ts');
		res.status(400).send({ message: 'Invalid phone number', OK: false });
		return;
	}

	if (req.body.phone.startsWith('0')) {
		req.body.phone = req.body.phone.replace('0', '+33');
	}

	if ((await Client.exists({ name: req.body.name })) || (await Client.exists({ phone: req.body.phone }))) {
		Log('Client already exists from ' + req.socket?.remoteAddress?.split(':').pop(), 'WARNING', 'NewClient.ts');
		res.status(400).send({ message: 'Client already exists', OK: false });
		return;
	}

	const client = new Client({ name: req.body.name, phone: req.body.phone, called: 'not called' });
	client
		.save()
		.then(() => {
			Log('Client created by ' + req.socket?.remoteAddress?.split(':').pop(), 'INFORMATION', 'NewClient.ts');
			res.status(201).send({ message: 'Client created', OK: true });
		})
		.catch(error => {
			Log('Error creating client: ' + error, 'ERROR', 'NewClient.ts');
			res.status(500).send({ message: 'Error creating client: ' + error, OK: false });
		});
}
