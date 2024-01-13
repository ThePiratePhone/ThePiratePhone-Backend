import { Request, Response } from 'express';
import { Client } from '../Models/Client';
import { Log } from '../tools/log';

export default async function NewClient(req: Request<any>, res: Response<any>) {
	if (req.body.name == null || req.body.phone == null) {
		Log('Missing parameters from ' + req.socket?.remoteAddress?.split(':').pop(), 'WARNING', 'NewClient.ts');
		res.status(400).send('Missing parameters');
		return;
	}

	if (
		req.body.name == '' ||
		typeof req.body.name != 'string' ||
		req.body.phone == '' ||
		typeof req.body.phone != 'string'
	) {
		Log('Invalid parameters from ' + req.socket?.remoteAddress?.split(':').pop(), 'WARNING', 'NewClient.ts');
		res.status(400).send('Invalid parameters');
		return;
	}

	if (req.body.phone.length < 10 || req.body.phone.length > 12) {
		Log('Invalid phone number from ' + req.socket?.remoteAddress?.split(':').pop(), 'WARNING', 'NewClient.ts');
		res.status(400).send('Invalid phone number');
		return;
	}

	if ((await Client.findOne({ name: req.body.name })) || (await Client.findOne({ phone: req.body.phone }))) {
		Log('Client already exists from ' + req.socket?.remoteAddress?.split(':').pop(), 'WARNING', 'NewClient.ts');
		res.status(400).send('Client already exists');
		return;
	}

	const client = new Client({ name: req.body.name, phone: req.body.phone, called: 'not called' });
	client
		.save()
		.then(() => {
			Log('Client created by ' + req.socket?.remoteAddress?.split(':').pop(), 'INFORMATION', 'NewClient.ts');
			res.status(201).send('Client created');
		})
		.catch(error => {
			Log('Error creating client: ' + error, 'ERROR', 'NewClient.ts');
			res.status(500).send('Error creating client: ' + error);
		});
}
