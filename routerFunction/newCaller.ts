import { Request, Response } from 'express';
import { Log } from '../tools/log';
import { Caller } from '../Models/Caller';
import phoneNumberCheck from '../tools/phoneNumberCheck';

export default async function NewCaller(req: Request<any>, res: Response<any>) {
	const ip = req.socket?.remoteAddress?.split(':').pop();
	if (!req.body || !req.body.name || !req.body.phone || !req.body.pinCode) {
		Log('Missing parameters from ' + ip, 'WARNING', 'NewCaller.ts');
		res.status(400).send({ message: 'Missing parameters', OK: false });
		return;
	}
	if (
		typeof req.body.name !== 'string' ||
		typeof req.body.phone !== 'string' ||
		typeof req.body.pinCode !== 'string' ||
		req.body.pinCode.length != 4
	) {
		Log('Invalid parameters from ' + ip, 'WARNING', 'NewCaller.ts');
		res.status(400).send({ message: 'Invalid parameters', OK: false });
		return;
	}
	if (!phoneNumberCheck(req.body.phone)) {
		Log('Invalid phone number from ' + ip, 'WARNING', 'NewCaller.ts');
		res.status(400).send({ message: 'Invalid phone number', OK: false });
		return;
	}

	if ((await Caller.exists({ phone: req.body.phone })) || (await Caller.exists({ name: req.body.name }))) {
		Log('Caller already exists from ' + ip, 'WARNING', 'NewCaller.ts');
		res.status(400).send({ message: 'Caller already exists', OK: false });
		return;
	}

	if (req.body.phone.startsWith('0')) {
		req.body.phone = req.body.phone.replace('0', '+33');
	}

	const caller = new Caller({
		name: req.body.name,
		phone: req.body.phone,
		pinCode: req.body.pinCode,
		timeInCall: new Map<String, Number>()
	});

	caller
		.save()
		.then(() => {
			Log('Caller created by ' + ip, 'INFORMATION', 'NewCaller.ts');
			res.status(201).send({ message: 'Caller created', OK: true });
		})
		.catch(error => {
			Log('Error creating caller: ' + error, 'ERROR', 'NewCaller.ts');
			res.status(500).send({ message: 'Error creating caller: ' + error, OK: false });
		});
}
