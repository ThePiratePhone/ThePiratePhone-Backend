import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import { log } from '../../tools/log';
import { Area } from '../../Models/area';
import { Caller } from '../../Models/Caller';

export default async function changePassword(req: Request<any>, res: Response<any>) {
	const ip = req.socket?.remoteAddress?.split(':').pop();
	if (
		!req.body ||
		typeof req.body.phone != 'string' ||
		typeof req.body.pinCode != 'string' ||
		!ObjectId.isValid(req.body.area) ||
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

	const area = await Area.findOne({ _id: req.body.area });
	if (!area) {
		res.status(400).send({ message: 'Invalid area', OK: false });
		log(`Invalid area from: ` + ip, 'WARNING', 'changePassword.ts');
		return;
	}

	if (req.body.phone.startsWith('0')) {
		req.body.phone = req.body.phone.replace('0', '+33');
	}

	const result = await Caller.updateOne(
		{ phone: req.body.phone, area: area._id, pinCode: req.body.pinCode },
		{ pinCode: req.body.newPin }
	);

	if (result.modifiedCount == 0) {
		res.status(400).send({ message: 'Invalid credentials', OK: false });
		log(`Invalid credentials from: ` + ip, 'WARNING', 'changePassword.ts');
		return;
	}

	res.status(200).send({ message: 'password changed', OK: true });
	log(`user ${req.body.phone} password chnaged from: ` + ip, 'INFORMATION', 'changePassword.ts');
}
