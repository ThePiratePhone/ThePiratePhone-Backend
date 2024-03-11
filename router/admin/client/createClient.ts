import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';

import { Area } from '../../../Models/Area';
import { Client } from '../../../Models/Client';
import clearPhone from '../../../tools/clearPhone';
import { log } from '../../../tools/log';
import phoneNumberCheck from '../../../tools/phoneNumberCheck';

export default async function createClient(req: Request<any>, res: Response<any>) {
	const ip = req.socket?.remoteAddress?.split(':').pop();
	if (
		!req.body ||
		typeof req.body.phone != 'string' ||
		typeof req.body.name != 'string' ||
		(typeof req.body.promotion != 'undefined' && typeof req.body.promotion != 'string') ||
		(typeof req.body.institution != 'undefined' && typeof req.body.institution != 'string') ||
		typeof req.body.adminCode != 'string' ||
		!ObjectId.isValid(req.body.area)
	) {
		res.status(400).send({ message: 'Missing parameters', OK: false });
		log(`Missing parameters from ` + ip, 'WARNING', 'createClient.ts');
		return;
	}

	const area = await Area.findOne({ AdminPassword: req.body.adminCode, _id: req.body.area });
	if (!area) {
		res.status(401).send({ message: 'Wrong admin code', OK: false });
		log(`Wrong admin code from ${ip}`, 'WARNING', 'createClient.ts');
		return;
	}

	req.body.phone = clearPhone(req.body.phone);
	if (!phoneNumberCheck(req.body.phone)) {
		res.status(400).send({ message: 'Wrong phone number', OK: false });
		log(`Wrong phone number from ${area.name} (${ip})`, 'WARNING', 'createClient.ts');
		return;
	}

	if ((await Client.findOne({ phone: req.body.phone })) != null) {
		res.status(401).send({ message: 'User already exist', OK: false });
		log(`User already exist from ${area.name} (${ip})`, 'WARNING', 'createClient.ts');
		return;
	}

	const user = new Client({
		area: area._id,
		name: req.body.name,
		phone: req.body.phone,
		data: new Map(),
		promotion: req.body.promotion ?? null,
		institution: req.body.institution ?? null
	});
	try {
		await user.save();
		res.status(200).send({ message: 'user ' + user.name + ' created', OK: true });
		log(`user ${user.name} created from ${area.name} (${ip})`, 'INFORMATION', 'createClient.ts');
	} catch (error: any) {
		res.status(500).send({ message: 'Internal server error', OK: false });
		log(`Internal server error: ${error.message} from ${area.name} (${ip})`, 'ERROR', 'createClient.ts');
	}
}
