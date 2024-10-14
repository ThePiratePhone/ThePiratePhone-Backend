import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';

import { Area } from '../../../Models/Area';
import { log } from '../../../tools/log';
import { Campaign } from '../../../Models/Campaign';

export default async function changePasword(req: Request<any>, res: Response<any>) {
	const ip = req.hostname;
	if (
		!req.body ||
		typeof req.body.adminCode != 'string' ||
		typeof req.body.newAdminCode != 'string' || req.body.newAdminCode.trim() === '' ||
		!ObjectId.isValid(req.body.area)
	) {
		res.status(400).send({ message: 'Missing parameters', OK: false });
		log(`Missing parameters from ` + ip, 'WARNING', __filename);
		return;
	}

	const area = await Area.findOne({ _id: { $eq: req.body.area }, adminPassword: { $eq: req.body.adminCode } });
	if (!area) {
		res.status(401).send({ message: 'Wrong admin code', OK: false });
		log(`Wrong admin code from ${ip}`, 'WARNING', __filename);
		return;
	}

	const output = await Campaign.updateOne({ _id: area._id }, { adminPassword: { $eq: req.body.newAdminCode } });

	if (output.modifiedCount == 0) {
		res.status(404).send({ message: 'Campaign not found', OK: false });
		log(`Campaign not found from ${ip}`, 'WARNING', __filename);
		return;
	}

	res.status(200).send({ message: 'OK', OK: true });
	log(`Admin password changed from ${ip} (${area.name})`, 'INFO', __filename);
}
