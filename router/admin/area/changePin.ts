import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';

import { Area } from '../../../Models/Area';
import { log } from '../../../tools/log';

export default async function ChangePin(req: Request<any>, res: Response<any>) {
	const ip = req.socket?.remoteAddress?.split(':').pop();
	if (
		!req.body ||
		typeof req.body.adminCode != 'string' ||
		!ObjectId.isValid(req.body.area) ||
		typeof req.body.newPin != 'string'
	) {
		res.status(400).send({ message: 'Missing parameters', OK: false });
		log(`Missing parameters from ` + ip, 'WARNING', 'ChangePin.ts');
		return;
	}

	if (req.body.newName.trim() == '') {
		res.status(400).send({ OK: false, message: 'bad new password' });
		log(`bad new password from ${ip}`, 'WARNING', 'ChangePin.ts');
		return;
	}
	const update = await Area.updateOne(
		{ _id: req.body.area, AdminPassword: req.body.adminCode },
		{ password: req.body.newPin }
	);
	if (update.matchedCount != 1) {
		res.status(404).send({ OK: false, message: 'no area found' });
		log(`no area found from ${ip}`, 'WARNING', 'ChangePin.ts');
		return;
	}

	res.status(200).send({ OK: true, message: 'password of area changed' });
	log(`password of area changed from ${ip}`, 'WARNING', 'ChangePin.ts');
	return;
}
