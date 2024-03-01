import { Request, Response } from 'express';

import { Caller } from '../../Models/Caller';
import checkCredentials from '../../tools/checkCredentials';
import clearPhone from '../../tools/clearPhone';
import { log } from '../../tools/log';

export default async function changePassword(req: Request<any>, res: Response<any>) {
	const ip = req.socket?.remoteAddress?.split(':').pop();
	if (
		!req.body ||
		typeof req.body.phone != 'string' ||
		typeof req.body.pinCode != 'string' ||
		typeof req.body.newPin != 'string'
	) {
		res.status(400).send({ message: 'Missing parameters', OK: false });
		log(`Missing parameters from: ` + ip, 'WARNING', 'changePassword.ts');
		return;
	}

	if (req.body.pinCode.length != 4) {
		res.status(400).send({ message: 'Invalid pin code', OK: false });
		log(`Invalid pin code from: ` + ip, 'WARNING', 'createCaller.ts');
		return;
	}

	req.body.phone = clearPhone(req.body.phone);

	const caller = await checkCredentials(req.body.phone, req.body.pinCode);
	if (!caller) {
		res.status(403).send({ message: 'Invalid credential', OK: false });
		log(`Invalid credential from: ${req.body.phone} (${ip})`, 'WARNING', 'changePassword.ts');
		return;
	}

	if (req.body.newPin.length != 4) {
		res.status(400).send({ message: 'Invalid new pin code', OK: false });
		log(`Invalid new pin code from: ` + ip, 'WARNING', 'createCaller.ts');
		return;
	}

	if (req.body.newPin == req.body.pinCode) {
		res.status(200).send({ message: 'Same credentials', OK: true });
		log(`Same credentials from : ` + ip, 'INFORMATION', 'createCaller.ts');
		return;
	}

	const result = await Caller.updateOne(
		{ phone: req.body.phone, pinCode: req.body.pinCode },
		{ pinCode: req.body.newPin }
	);

	if (result.modifiedCount == 0) {
		res.status(400).send({ message: 'Invalid credentials', OK: false });
		log(`Invalid credentials from: ${caller.name} (${ip})`, 'WARNING', 'changePassword.ts');
		return;
	}

	res.status(200).send({ message: 'password changed', OK: true });
	log(`user ${req.body.phone} password chnaged from: ${caller.name} (${ip})`, 'INFORMATION', 'changePassword.ts');
}
