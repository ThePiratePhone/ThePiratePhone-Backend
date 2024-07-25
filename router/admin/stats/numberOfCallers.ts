import { Request, Response } from 'express';

import { Area } from '../../../Models/Area';
import { Campaign } from '../../../Models/Campaign';
import { log } from '../../../tools/log';
import { ObjectId } from 'mongodb';
import { Caller } from '../../../Models/Caller';

export default async function numberOfCallers(req: Request<any>, res: Response<any>) {
	const ip = req.socket?.remoteAddress?.split(':').pop();
	if (
		!req.body ||
		!ObjectId.isValid(req.body.campaign) ||
		typeof req.body.adminCode != 'string' ||
		!ObjectId.isValid(req.body.area)
	) {
		res.status(400).send({ message: 'Missing parameters', OK: false });
		log('Missing parameters from ' + ip, 'WARNING', __filename);
		return;
	}

	const area = await Area.findOne({ _id: { $eq: req.body.area }, adminPassword: { $eq: req.body.adminCode } });
	if (!area) {
		res.status(401).send({ message: 'Wrong Creantial', OK: false });
		log('Wrong Creantial from ' + ip, 'WARNING', __filename);
		return;
	}

	const campaign = await Campaign.findOne({ _id: { $eq: req.body.campaign } });
	if (!campaign) {
		res.status(401).send({ message: 'Wrong campaign id', OK: false });
		log(`Wrong campaign id from ${area.name} (${ip})`, 'WARNING', __filename);
		return;
	}

	const countCallers = await Caller.countDocuments({ campaigns: campaign._id });

	res.status(200).send({
		message: 'in this campaign ' + countCallers + ' caller was added',
		OK: true,
		data: { numberOfCallers: countCallers }
	});
	log(`number of caller get by ${area.name} (${ip})`, 'INFO', __filename);
}
