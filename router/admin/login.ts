import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';

import { Area } from '../../Models/Area';
import { log } from '../../tools/log';
import getCurrentCampaign from '../../tools/getCurrentCampaign';

export default async function login(req: Request<any>, res: Response<any>) {
	const ip = req.socket?.remoteAddress?.split(':').pop();
	if (!req.body || typeof req.body.adminCode != 'string' || !ObjectId.isValid(req.body.area)) {
		res.status(400).send({ message: 'Missing parameters', OK: false });
		log(`Missing parameters from ` + ip, 'WARNING', 'login.ts');
		return;
	}

	const area = await Area.findOne({ _id: req.body.area, AdminPassword: req.body.adminCode });
	if (!area) {
		res.status(401).send({ message: 'Wrong admin code', OK: false });
		log(`Wrong admin code from ${ip}`, 'WARNING', 'login.ts');
		return;
	}

	let campaign = await getCurrentCampaign(area._id);
	if (!campaign) {
		res.status(401).send({ message: 'Wrong campaign id', OK: false });
		log(`Wrong campaign id from ${area.name} (${ip})`, 'WARNING', 'login.ts');
		return;
	}

	res.status(200).send({
		message: 'OK',
		data: {
			actualCampaignName: campaign.name,
			actualCampaignCallStart: campaign.callHoursStart,
			actualCampaignCallEnd: campaign.callHoursEnd,
			actualCampaignMaxCall: campaign.nbMaxCallCampaign,
			actualCampaignTimeBetweenCall: campaign.timeBetweenCall
		},
		OK: true
	});
}
