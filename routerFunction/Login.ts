import { Request, Response } from 'express';
import phoneNumberCheck from '../tools/phoneNumberCheck';
import checkCredential from '../tools/checkCreantial';

export default async function login(req: Request<any>, res: Response<any>) {
	if (!req.body || typeof req.body.phone != 'string' || typeof req.body.pin != 'string') {
		res.status(400).send({ message: 'Missing parameters', OK: false });
		return;
	}

	if (!phoneNumberCheck(req.body.phone)) {
		res.status(400).send({ message: 'Invalid phone number', OK: false });
		return;
	}

	const caller = await checkCredential(req.body.phone, req.body.pin);
	if (!caller) {
		res.status(400).send({ message: 'Invalid credentials', OK: false });
		return;
	}

	res.status(200).send({ message: 'Logged in', OK: true, data: caller });
}
