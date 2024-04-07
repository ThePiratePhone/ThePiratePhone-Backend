import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';

import { Area } from '../../../Models/Area';
import { Campaign } from '../../../Models/Campaign';
import { log } from '../../../tools/log';

export default async function getCampaign(req: Request<any>, res: Response<any>) {
	const ip = req.socket?.remoteAddress?.split(':').pop();
	if (
		!req.body ||
		typeof req.body.adminCode != 'string' ||
		!ObjectId.isValid(req.body.CampaignId) ||
		!ObjectId.isValid(req.body.area)
	) {
		res.status(400).send({ message: 'Missing parameters', OK: false });
		log(`Missing parameters from: ` + ip, 'WARNING', 'getCampaign.ts');
		return;
	}

	const area = await Area.findOne({ AdminPassword: req.body.adminCode, _id: req.body.area });
	if (!area) {
		res.status(401).send({ message: 'Wrong admin code', OK: false });
		log(`Wrong admin code from ` + ip, 'WARNING', 'getCampaign.ts');
		return;
	}
	const campaign = await Campaign.findOne({ area: area._id, _id: req.body.CampaignId });
	if (!campaign) {
		res.status(404).send({ message: 'no campaign', OK: false });
		log(`no campaign from ${area.name} (${ip})`, 'WARNING', 'getCampaign.ts');
		return;
	}

	res.status(200).send({ message: 'OK', OK: true, data: campaign });
}
