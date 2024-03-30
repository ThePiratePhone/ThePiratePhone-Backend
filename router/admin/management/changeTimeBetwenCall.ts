import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';

import { Area } from '../../../Models/Area';
import { Campaign } from '../../../Models/Campaign';
import getCurrentCampaign from '../../../tools/getCurrentCampaign';
import { log } from '../../../tools/log';

export default async function changeTimeBetwenCall(req: Request<any>, res: Response<any>) {
	const ip = req.socket?.remoteAddress?.split(':').pop();
	if (
		!req.body ||
		typeof req.body.newTimeBetweenCall != 'number' ||
		typeof req.body.adminCode != 'string' ||
		!ObjectId.isValid(req.body.area) ||
		(req.body.CampaignId && !ObjectId.isValid(req.body.CampaignId))
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

	let campaign: InstanceType<typeof Campaign> | null;
	if (req.body.CampaignId) {
		campaign = await Campaign.findOne({ _id: req.body.CampaignId, Area: area._id });
	} else {
		campaign = await getCurrentCampaign(area._id);
	}
	if (!campaign) {
		res.status(401).send({ message: 'Wrong campaign id', OK: false });
		log(`Wrong campaign id from ${area.name} (${ip})`, 'WARNING', 'changeTimeBetwenCall.ts');
		return;
	}

	req.body.newTimeBetweenCall = parseInt(req.body.newTimeBetweenCall);

	const output = await Campaign.updateOne({ _id: campaign._id }, { timeBetweenCall: req.body.newTimeBetweenCall });
	if (output.matchedCount != 1) {
		res.status(404).send({ message: 'Campaign not found', OK: false });
		log(`Campaign not found from ${area.name} (${ip})`, 'WARNING', 'changeTimeBetwenCall.ts');
		return;
	}

	res.status(200).send({ message: 'OK', OK: true });
	log(`time betwen call changed from ${ip} (${area.name})`, 'INFORMATION', 'changeTimeBetwenCall.ts');
}
