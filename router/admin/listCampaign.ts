import { Request, Response } from 'express';
import { log } from '../../tools/log';
import { Area } from '../../Models/area';
import { Campaign } from '../../Models/Campaign';
import { ObjectId } from 'mongodb';

export default async function listCampaign(req: Request<any>, res: Response<any>) {
	const ip = req.socket?.remoteAddress?.split(':').pop();
	if (
		!req.body ||
		typeof req.body.adminCode != 'string' ||
		(req.body.skip && typeof req.body.skip != 'number') ||
		(req.body.limit && typeof req.body.limit != 'number') ||
		!ObjectId.isValid(req.body.area)
	) {
		res.status(400).send({ message: 'Missing parameters', OK: false });
		log(`Missing parameters from: ` + ip, 'WARNING', 'listCampaign.ts');
		return;
	}

	const area = await Area.findOne({ AdminPassword: req.body.adminCode, _id: req.body.area });
	if (!area) {
		res.status(401).send({ message: 'Wrong admin code', OK: false });
		log(`Wrong admin code from ` + ip, 'WARNING', 'listCampaign.ts');
		return;
	}

	const numberOfCampaign = await Campaign.countDocuments({ Area: area._id });
	const campaign = await Campaign.find({ Area: area._id })
		.skip(req.body.skip ? req.body.skip : 0)
		.limit(req.body.limit ? req.body.limit : 50);
	if (!campaign) {
		res.status(401).send({ message: 'no campaign', OK: false });
		log(`no campaign from ${area.name} (${ip})`, 'WARNING', 'listCampaign.ts');
		return;
	}

	res.status(200).send({ message: 'OK', OK: true, data: { campaign: campaign, numberOfCampaign: numberOfCampaign } });
}
