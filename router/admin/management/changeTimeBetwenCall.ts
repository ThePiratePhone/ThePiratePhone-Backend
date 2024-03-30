import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';

import { Area } from '../../../Models/Area';
import { log } from '../../../tools/log';
import { Campaign } from '../../../Models/Campaign';

export default async function changeTimeBetwenCall(req: Request<any>, res: Response<any>) {
	const ip = req.socket?.remoteAddress?.split(':').pop();
	if (
		!req.body ||
		typeof req.body.newTimeBetweenCall != 'number' ||
		typeof req.body.adminCode != 'string' ||
		!ObjectId.isValid(req.body.campaign) ||
		!ObjectId.isValid(req.body.area)
	) {
		res.status(400).send({ message: 'Missing parameters', OK: false });
		log(`Missing parameters from ` + ip, 'WARNING', 'changeTimeBetwenCall.ts');
		return;
	}

	const area = await Area.findOne({ _id: req.body.area, AdminPassword: req.body.adminCode });
	if (!area) {
		res.status(401).send({ message: 'Wrong admin code', OK: false });
		log(`Wrong admin code from ${ip}`, 'WARNING', 'changeTimeBetwenCall.ts');
		return;
	}

	const output = await Campaign.updateOne(
		{ _id: req.body.campaign },
		{ timeBetweenCall: req.body.newTimeBetweenCall }
	);
	if (output.matchedCount != 1) {
		res.status(404).send({ message: 'Campaign not found', OK: false });
		log(`Campaign not found from ${area.name} (${ip})`, 'WARNING', 'changeTimeBetwenCall.ts');
		return;
	}

	res.status(200).send({ message: 'OK', OK: true });
	log(`time betwen call changed from ${ip} (${area.name})`, 'INFORMATION', 'changeTimeBetwenCall.ts');
}
