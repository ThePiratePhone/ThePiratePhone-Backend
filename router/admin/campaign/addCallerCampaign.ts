import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';

import { Area } from '../../../Models/Area';
import { Caller } from '../../../Models/Caller';
import { Campaign } from '../../../Models/Campaign';
import clearPhone from '../../../tools/clearPhone';
import { log } from '../../../tools/log';

export default async function addCallerCampaign(req: Request<any>, res: Response<any>) {
	const ip = req.socket?.remoteAddress?.split(':').pop();
	if (
		!req.body ||
		!ObjectId.isValid(req.body.campaign) ||
		typeof req.body.phone != 'string' ||
		typeof req.body.adminCode != 'string' ||
		!ObjectId.isValid(req.body.area)
	) {
		res.status(400).send({ message: 'Missing parameters', OK: false });
		log(`Missing parameters`, 'WARNING', 'addCallerCampaign.ts');
		return;
	}

	const area = await Area.findOne({ AdminPassword: req.body.adminCode, _id: req.body.area });
	if (!area) {
		res.status(401).send({ message: 'Wrong admin code', OK: false });
		log(`Wrong admin code from ` + ip, 'WARNING', 'addCallerCampaign.ts');
		return;
	}

	req.body.phone = clearPhone(req.body.phone);

	const caller = await Caller.findOne({ phone: req.body.Phone, area: area._id });
	if (!caller) {
		res.status(404).send({ message: 'Caller not found', OK: false });
		log(`Caller not found from ${area.name} (${ip})`, 'WARNING', 'addCallerCampaign.ts');
		return;
	}

	const campaign = await Campaign.findOne({ _id: req.body.campaign, area: area._id });
	if (!campaign) {
		res.status(404).send({ message: 'Campaign not found', OK: false });
		log(`Campaign not found from ${area.name} (${ip})`, 'WARNING', 'addCallerCampaign.ts');
		return;
	}

	if (caller.campaigns.includes(campaign._id)) {
		res.status(200).send({ message: 'Caller already in campaign', OK: true });
		log(`Caller already in campaign from ${area.name} (${ip})`, 'WARNING', 'addCallerCampaign.ts');
		return;
	}
	await caller.updateOne({ $push: { campaigns: campaign._id } });

	res.status(200).send({ message: 'Caller added to campaign', OK: true });
	log(`Caller added to campaign from ${area.name} (${ip})`, 'INFORMATION', 'addCallerCampaign.ts');
}
