import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';

import { Area } from '../../../Models/Area';
import { Campaign } from '../../../Models/Campaign';
import { log } from '../../../tools/log';

export default async function createCampaign(req: Request<any>, res: Response<any>) {
	const ip = req.socket?.remoteAddress?.split(':').pop();
	if (
		!req.body ||
		typeof req.body.name != 'string' ||
		typeof req.body.script != 'string' ||
		typeof req.body.dateStart != 'string' ||
		typeof req.body.dateEnd != 'string' ||
		typeof req.body.adminCode != 'string' ||
		typeof req.body.password != 'string' ||
		(typeof req.body.callHoursStart != 'undefined' && typeof req.body.callHoursStart != 'number') ||
		(typeof req.body.callHoursEnd != 'undefined' && typeof req.body.callHoursEnd != 'number') ||
		!ObjectId.isValid(req.body.area)
	) {
		res.status(400).send({ message: 'Missing parameters', OK: false });
		log(`Missing parameters from ` + ip, 'WARNING', 'CreateCampaign.ts');
		return;
	}

	const area = await Area.findOne({ AdminPassword: req.body.adminCode, _id: req.body.area });
	if (!area) {
		res.status(401).send({ message: 'Wrong admin code', OK: false });
		log(`Wrong admin code from ${ip}`, 'WARNING', 'CreateCampaign.ts');
		return;
	}

	const dateEnd = new Date(req.body.dateEnd);
	const dateStart = new Date(req.body.dateStart);
	if (isNaN(dateEnd.getTime()) || isNaN(dateStart.getTime()) || dateEnd < dateStart) {
		res.status(400).send({ message: 'dateEnd < dateStart', OK: false });
		log(`dateEnd < dateStart from ${area.name} (${ip})`, 'WARNING', 'CreateCampaign.ts');
		return;
	}

	if ((await Campaign.findOne({ name: req.body.name, area: area._id })) != null) {
		res.status(400).send({ message: 'Campaign already exist', OK: false });
		log(`Campaign already exist from ${area.name} (${ip})`, 'WARNING', 'CreateCampaign.ts');
		return;
	}

	const existingCampaign = await Campaign.findOne({
		$or: [
			{ $and: [{ dateStart: { $lte: dateStart } }, { dateEnd: { $gte: dateStart } }] },
			{ $and: [{ dateStart: { $lte: dateEnd } }, { dateEnd: { $gte: dateEnd } }] },
			{ $and: [{ dateStart: { $gte: dateStart } }, { dateEnd: { $lte: dateEnd } }] }
		],
		area: area._id
	});

	if (existingCampaign) {
		res.status(400).send({ message: 'Campaign overlaps with an existing campaign', OK: false });
		log(`Campaign overlaps with an existing campaign from ${area.name} (${ip})`, 'WARNING', 'CreateCampaign.ts');
		return;
	}

	const campaign = new Campaign({
		area: area._id,
		name: req.body.name,
		script: req.body.script,
		dateStart: dateStart,
		dateEnd: dateEnd,
		callerList: [],
		trashUser: [],
		password: req.body.password,
		callHoursStart: req.body.callHoursStart,
		callHoursEnd: req.body.callHoursEnd
	});
	await campaign.save();
	await Area.updateOne({ _id: area._id }, { $push: { CampaignList: campaign._id } });
	res.status(200).send({ message: 'Campaign created', OK: true });
	log(`Campaign created from ${area.name} (${ip})`, 'INFORMATION', 'CreateCampaign.ts');
}
