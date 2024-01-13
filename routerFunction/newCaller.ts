import { Request, Response } from 'express';
import { Log } from '../tools/log';
import { Caller } from '../Models/Caller';

export default async function NewCaller(req: Request<any>, res: Response<any>) {
	const ip = req.socket?.remoteAddress?.split(':').pop();
	if (!req.body || !req.body.name || !req.body.phone || !req.body.pinCode) {
		Log('Missing parameters from ' + ip, 'WARNING', 'NewCaller.ts');
		res.status(400).send('Missing parameters');
		return;
	}
	if (
		typeof req.body.name !== 'string' ||
		req.body.name == '' ||
		typeof req.body.phone !== 'string' ||
		req.body.phone == '' ||
		typeof req.body.pinCode !== 'string' ||
		req.body.pinCode.length != 4
	) {
		Log('Invalid parameters from ' + ip, 'WARNING', 'NewCaller.ts');
		res.status(400).send('Invalid parameters');
		return;
	}

	if ((await Caller.exists({ phone: req.body.phone })) || (await Caller.exists({ name: req.body.name }))) {
		Log('Caller already exists from ' + ip, 'WARNING', 'NewCaller.ts');
		res.status(400).send('Caller already exists');
		return;
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
			res.status(201).send('Caller created');
		})
		.catch(error => {
			Log('Error creating caller: ' + error, 'ERROR', 'NewCaller.ts');
			res.status(500).send('Error creating caller: ' + error);
		});
}
