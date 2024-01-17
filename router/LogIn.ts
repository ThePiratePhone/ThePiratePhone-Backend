import { Request, Response } from 'express';
import checkCredential from '../tools/checkCreantial';
import phoneNumberCheck from '../tools/phoneNumberCheck';

export default async function login(req: Request<any>, res: Response<any>) {
	const ip = req.socket?.remoteAddress?.split(':').pop();

	if (
		!req.body ||
		typeof req.body.name != 'string' ||
		typeof req.body.pinCode != 'string' ||
		typeof req.body.area != 'string'
	) {
		res.status(400).send({ message: 'Missing parameters', OK: false });
		return;
	}

	if (req.body.pinCode.length != 4) {
		res.status(400).send({ message: 'Wrong pin code', OK: false });
		return;
	}

	if (req.body.phone.startsWith('0')) {
		req.body.phone = req.body.phone.replace('0', '+33');
	}
	if (!phoneNumberCheck(req.body.phone)) {
		res.status(400).send({ message: 'Wrong phone number', OK: false });
		return;
	}

	const caller = await checkCredential(req.body.phone, req.body.area, req.body.pinCode);
	if (caller) {
		res.status(200).send({ message: 'OK', OK: true, data: caller });
		return;
	} else {
		res.status(403).send({ message: 'Wrong credentials', OK: false });
		return;
	}
}
