import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import { log } from '../../../tools/log';
import { Area } from '../../../Models/Area';
import { Client } from '../../../Models/Client';
import clearPhone from '../../../tools/clearPhone';
import phoneNumberCheck from '../../../tools/phoneNumberCheck';

export default async function removeClient(req: Request<any>, res: Response<any>) {
	const ip = req.socket?.remoteAddress?.split(':').pop();
	if (
		!req.body ||
		typeof req.body.phone != 'string' ||
		typeof req.body.adminCode != 'string' ||
		!ObjectId.isValid(req.body.area)
	) {
		res.status(400).send({ message: 'Missing parameters', OK: false });
		log(`Missing parameters from ` + ip, 'WARNING', 'removeClient.ts');
		return;
	}

	req.body.phone = clearPhone(req.body.phone);
	if (!phoneNumberCheck(req.body.phone)) {
		res.status(400).send({ message: 'Wrong phone number', OK: false });
		log(`Wrong phone number from ${ip}`, 'WARNING', 'removeClient.ts');
		return;
	}

	const area = await Area.findOne({ AdminPassword: req.body.adminCode, _id: req.body.area });
	if (!area) {
		res.status(401).send({ message: 'Wrong admin code', OK: false });
		log(`Wrong admin code from ${ip}`, 'WARNING', 'removeClient.ts');
		return;
	}

	const output = await Client.deleteOne({ phone: req.body.phone });
	if (output.deletedCount != 1) {
		res.status(404).send({ message: 'Client not found', OK: false });
		log(`Client not found from ${area.name} (${ip})`, 'WARNING', 'removeClient.ts');
		return;
	}

	res.status(200).send({ message: 'OK', OK: true });
	log(`Client removed from ${ip} (${area.name})`, 'INFORMATION', 'removeClient.ts');
}
