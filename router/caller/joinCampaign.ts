import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';

import { Area } from '../../Models/Area';
import { Campaign } from '../../Models/Campaign';
import checkCredentials from '../../tools/checkCredentials';
import getCurrentCampaign from '../../tools/getCurrentCampaign';
import { log } from '../../tools/log';

export default async function joinCampaign(req: Request<any>, res: Response<any>) {
	const ip = req.socket?.remoteAddress?.split(':').pop();

	if (
		!req.body ||
		typeof req.body.phone != 'string' ||
		typeof req.body.pinCode != 'string' ||
		!ObjectId.isValid(req.body.area) ||
		typeof req.body.campaignPassword != 'string'
	) {
		res.status(400).send({ message: 'Missing parameters', OK: false });
		log(`Missing parameters from: ` + ip, 'WARNING', 'joinCampaign.ts');
		return;
	}

	const caller = await checkCredentials(req.body.phone, req.body.pinCode);
	if (!caller) {
		res.status(403).send({ message: 'Wrong credentials', OK: false });
		log(`Wrong credentials from: ` + ip, 'WARNING', 'joinCampaign.ts');
		return;
	}

	const curentCampaign: any = await getCurrentCampaign(req.body.area);
	if (!curentCampaign) {
		res.status(400).send({ message: 'no actual campaign', OK: false });
		log(`no actual campaign from ${caller.name} (${ip})`, 'WARNING', 'joinCampaign.ts');
		return;
	}

	if (curentCampaign.password != req.body.campaignPassword) {
		res.status(403).send({ message: 'Wrong campaign password', OK: false });
		log(`Wrong campaign password from: ${caller.name} (${ip})`, 'WARNING', 'joinCampaign.ts');
		return;
	}

	if (caller.campaigns.includes(curentCampaign._id)) {
		res.status(403).send({ message: 'Caller already in campaign', OK: false });
		log(`Caller already in campaign from: ${caller.name} (${ip})`, 'WARNING', 'joinCampaign.ts');
		return;
	}

	const area = await Area.findById(curentCampaign.area);
	if (!area) {
		res.status(404).send({ message: 'Area not found', OK: false });
		log(`Area not found from: ${caller.name} (${ip})`, 'ERROR', 'joinCampaign.ts');
		return;
	}

	await Promise.all([
		Campaign.updateOne({ _id: curentCampaign._id }),
		caller.updateOne({ $push: { campaigns: curentCampaign._id } })
	]);
	res.status(200).send({
		message: 'Caller added to campaign',
		OK: true,
		data: {
			campaignName: curentCampaign.name,
			CampaignId: curentCampaign._id,
			areaName: area.name,
			areaId: area._id
		}
	});
	log(`Caller added to campaign from: ${caller.name} (${ip})`, 'INFORMATION', 'joinCampaign.ts');
}
