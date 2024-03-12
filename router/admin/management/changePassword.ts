import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';

import { Area } from '../../../Models/Area';
import { log } from '../../../tools/log';
import { Campaign } from '../../../Models/Campaign';

export default async function changePasword(req: Request<any>, res: Response<any>) {
	const ip = req.socket?.remoteAddress?.split(':').pop();
	if (
		!req.body ||
		typeof req.body.adminCode != 'string' ||
		req.body.newAdminCode ||
		!ObjectId.isValid(req.body.area)
	) {
		res.status(400).send({ message: 'Missing parameters', OK: false });
		log(`Missing parameters from ` + ip, 'WARNING', 'changePasword.ts');
		return;
	}

	const area = await Area.findOne({ _id: req.body.area, AdminPassword: req.body.adminCode });
	if (!area) {
		res.status(401).send({ message: 'Wrong admin code', OK: false });
		log(`Wrong admin code from ${ip}`, 'WARNING', 'changePasword.ts');
		return;
	}

	const output = await Campaign.updateOne({ _id: area._id }, { AdminPassword: req.body.newAdminCode });

	if (output.modifiedCount == 0) {
		res.status(404).send({ message: 'Campaign not found', OK: false });
		log(`Campaign not found from ${ip}`, 'WARNING', 'changePasword.ts');
		return;
	}

	res.status(200).send({ message: 'OK', OK: true });
	log(`Admin password changed from ${ip} (${area.name})`, 'INFORMATION', 'changePasword.ts');
}
