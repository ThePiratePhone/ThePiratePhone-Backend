import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';

import { Area } from '../../Models/Area';
import { Client } from '../../Models/Client';
import clearPhone from '../../tools/clearPhone';
import { log } from '../../tools/log';
import phoneNumberCheck from '../../tools/phoneNumberCheck';

export default async function createClients(req: Request<any>, res: Response<any>) {
	const ip = req.socket?.remoteAddress?.split(':').pop();
	if (
		!req.body ||
		req.body.data instanceof Array ||
		typeof req.body.adminCode != 'string' ||
		!ObjectId.isValid(req.body.area)
	) {
		res.status(400).send({ message: 'Missing parameters', OK: false });
		log(`Missing parameters from ` + ip, 'WARNING', 'createClient.ts');
		return;
	}

	if (req.body.data.length > 500) {
		res.status(400).send({ message: 'Too many users', OK: false });
		log(`Too many users from ` + ip, 'WARNING', 'createClient.ts');
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

	if ((await Client.findOne({ phone: req.body.phone, area: area._id })) != null) {
		res.status(401).send({ message: 'User already exist', OK: false });
		log(`User already exist from ${area.name} (${ip})`, 'WARNING', 'createClient.ts');
		return;
	}

	const errors: Array<[string, string, string]> = [];
	const sleep = req.body.data.map(async (usr: [string, string]) => {
		if (phoneNumberCheck(usr[1])) {
			errors.push([usr[0], usr[1], 'Wrong phone number']);
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
			return true;
		} catch (error: any) {
			if (error.code != 11000) {
				errors.push([usr[0], usr[1], error.message]);
			}
		}
	});
	await Promise.all(sleep);
	res.status(200).send({ message: 'OK', OK: true, errors: errors });
}
