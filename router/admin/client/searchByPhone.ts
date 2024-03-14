import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';

import { Area } from '../../../Models/Area';
import { Client } from '../../../Models/Client';
import clearPhone from '../../../tools/clearPhone';
import { log } from '../../../tools/log';

export default async function SearchByPhone(req: Request<any>, res: Response<any>) {
	const ip = req.socket?.remoteAddress?.split(':').pop();
	if (
		!req.body ||
		typeof req.body.phone != 'string' ||
		typeof req.body.adminCode != 'string' ||
		!ObjectId.isValid(req.body.area)
	) {
		res.status(400).send({ message: 'Missing parameters', OK: false });
		log(`Missing parameters from ` + ip, 'WARNING', 'shearchByPhone.ts');
		return;
	}

	const area = await Area.findOne({ AdminPassword: req.body.adminCode, _id: req.body.area });
	if (!area) {
		res.status(401).send({ message: 'Wrong admin code', OK: false });
		log(`Wrong admin code from ${ip}`, 'WARNING', 'shearchByPhone.ts');
		return;
	}

	req.body.phone = clearPhone(req.body.phone);
	req.body.phone = req.body.phone.match(/\d+/g)?.join('') || '';

	const output = await Client.find({ phone: { $regex: req.body.phone, $options: 'i' } }).limit(10);
	res.status(200).send({ message: 'OK', OK: true, data: output });
	log(`Clients searched from ${ip} (${area.name})`, 'INFORMATION', 'shearchByPhone.ts');
}
