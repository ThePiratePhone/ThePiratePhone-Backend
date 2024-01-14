import { Request, Response } from 'express';
import phoneNumberCheck from '../tools/phoneNumberCheck';
import checkCredential from '../tools/checkCreantial';
import { Log } from '../tools/log';

export default async function login(req: Request<any>, res: Response<any>) {
	const ip = req.socket?.remoteAddress?.split(':').pop();
	if (!req.body || typeof req.body.phone != 'string' || typeof req.body.pin != 'string') {
		res.status(400).send({ message: 'Missing parameters', OK: false });
		Log('Missing parameters', 'WARNING', 'Login.ts');
		return;
	}

	if (req.body.phone.startsWith('0')) {
		req.body.phone = req.body.phone.replace('0', '+33');
	}

	if (!phoneNumberCheck(req.body.phone)) {
		Log('Invalid phone number from ' + ip, 'WARNING', 'Login.ts');
		res.status(400).send({ message: 'Invalid phone number', OK: false });
		return;
	}

	const caller = await checkCredential(req.body.phone, req.body.pin);
	if (!caller) {
		Log('Invalid credentials from ' + ip, 'WARNING', 'Login.ts');
		res.status(400).send({ message: 'Invalid credentials', OK: false });
		return;
	}

	Log(caller.name + ' logged in from ' + ip, 'INFORMATION', 'Login.ts');
	res.status(200).send({ message: 'Logged in', OK: true, data: caller });
}
