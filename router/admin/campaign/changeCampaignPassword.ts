import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import { log } from '../../../tools/log';
import { Area } from '../../../Models/Area';
import { Campaign } from '../../../Models/Campaign';

export default async function changeCampaingPassword(req: Request<any>, res: Response<any>) {
	const ip = req.socket?.remoteAddress?.split(':').pop();
	if (
		!req.body ||
		typeof req.body.adminCode != 'string' ||
		typeof req.body.newCampaignCode != 'string' ||
		!ObjectId.isValid(req.body.area) ||
		!ObjectId.isValid(req.body.campaign)
	) {
		res.status(400).send({ message: 'Missing parameters', OK: false });
		log(`Missing parameters from ` + ip, 'WARNING', 'changeCampaingPassword.ts');
		return;
	}

	const area = await Area.findOne({ _id: req.body.area, AdminPassword: req.body.adminCode });
	if (!area) {
		res.status(401).send({ message: 'Wrong admin code', OK: false });
		log(`Wrong admin code from ${ip}`, 'WARNING', 'changeCampaingPassword.ts');
		return;
	}

	const output = await Campaign.updateOne({ _id: req.body.campaign }, { password: req.body.newCampaignCode });
	if (output.matchedCount != 1) {
		res.status(400).send({ message: 'Campaign not found', OK: false });
		log(`Campaign not found from ${ip}`, 'WARNING', 'changeCampaingPassword.ts');
		return;
	}

	res.status(200).send({ message: 'OK', OK: true });
	log(`Campaign password changed from ${ip} (${area.name})`, 'INFORMATION', 'changeCampaingPassword.ts');
}
