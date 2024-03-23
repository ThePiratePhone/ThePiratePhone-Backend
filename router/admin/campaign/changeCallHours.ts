import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';

import { Area } from '../../../Models/Area';
import { Campaign } from '../../../Models/Campaign';
import getCurrentCampaign from '../../../tools/getCurrentCampaign';
import { log } from '../../../tools/log';

export default async function changeCallHours(req: Request<any>, res: Response<any>) {
	const ip = req.socket?.remoteAddress?.split(':').pop();
	if (
		!req.body ||
		typeof req.body.adminCode != 'string' ||
		typeof req.body.newEndHours != 'string' ||
		typeof req.body.newStartHours != 'string' ||
		!ObjectId.isValid(req.body.area) ||
		(req.body.CampaignId && !ObjectId.isValid(req.body.CampaignId))
	) {
		res.status(400).send({ message: 'Missing parameters', OK: false });
		log(`Missing parameters from ` + ip, 'WARNING', 'changeCallHours.ts');
		return;
	}

	const area = await Area.findOne({ _id: req.body.area, AdminPassword: req.body.adminCode });
	if (!area) {
		res.status(401).send({ message: 'Wrong admin code', OK: false });
		log(`Wrong admin code from ${ip}`, 'WARNING', 'changeCallHours.ts');
		return;
	}

	let campaign: InstanceType<typeof Campaign> | null = null;

	if (req.body.CampaignId) {
		campaign = await Campaign.findOne({ _id: req.body.CampaignId, Area: area._id });
	} else {
		campaign = await getCurrentCampaign(area._id);
	}
	if (!campaign) {
		res.status(401).send({ message: 'Wrong campaign id', OK: false });
		log(`Wrong campaign id from ${area.name} (${ip})`, 'WARNING', 'changeCallHours.ts');
		return;
	}

	const dateEnd = Date.parse(req.body.newEndHours);
	if (!dateEnd) {
		res.status(400).send({ message: 'Invalid end date', OK: false });
		log(`Invalid end date from ${ip}`, 'WARNING', 'changeCallHours.ts');
		return;
	}
	const dateStart = Date.parse(req.body.newStartHours);
	if (!dateStart) {
		res.status(400).send({ message: 'Invalid start date', OK: false });
		log(`Invalid start date from ${ip}`, 'WARNING', 'changeCallHours.ts');
		return;
	}

	const output = await Campaign.updateOne(
		{ _id: campaign._id },
		{ callHoursEnd: dateEnd, callHoursStart: dateStart }
	);
	if (output.matchedCount != 1) {
		res.status(400).send({ message: 'Campaign not found', OK: false });
		log(`Campaign not found from ${ip}`, 'WARNING', 'changeCallHours.ts');
		return;
	}

	res.status(200).send({ message: 'OK', OK: true });
	log(`Campaign hours changed from ${ip} (${area.name})`, 'INFORMATION', 'changeCallHours.ts');
}
