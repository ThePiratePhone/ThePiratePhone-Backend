import { Request, Response } from 'express';
import { log } from '../../tools/log';
import { Area } from '../../Models/area';
import { Client } from '../../Models/Client';
import { Campaign } from '../../Models/Campaign';
import { ObjectId } from 'mongodb';

export default async function listClientCampaign(req: Request<any>, res: Response<any>) {
	const ip = req.socket?.remoteAddress?.split(':').pop();
	if (
		!req.body ||
		typeof req.body.adminCode != 'string' ||
		!ObjectId.isValid(req.body.CampaignId) ||
		(req.body.skip && typeof req.body.skip != 'number') ||
		(req.body.limit && typeof req.body.limit != 'number')
	) {
		res.status(400).send({ message: 'Missing parameters', OK: false });
		log('Missing parameters from: ' + ip, 'WARNING', 'listClientCampaign.ts');
		return;
	}

	const area = await Area.findOne({ AdminPassword: req.body.adminCode });
	if (!area) {
		res.status(401).send({ message: 'Wrong admin code', OK: false });
		log('Wrong admin code from ' + ip, 'WARNING', 'listClientCampaign.ts');
		return;
	}

	const campaign = await Campaign.findOne({ _id: req.body.CampaignId, Area: area._id });
	if (!campaign) {
		res.status(401).send({ message: 'Wrong campaign id', OK: false });
		log('Wrong campaign id from ' + ip, 'WARNING', 'listClientCampaign.ts');
		return;
	}

	const clients = await Client.find({ _id: { $in: campaign.userList } })
		.skip(req.body.skip ? req.body.skip : 0)
		.limit(req.body.limit ? req.body.limit : 50);
	if (!clients) {
		res.status(401).send({ message: 'No clients found', OK: false });
		log('No clients found from ' + ip, 'WARNING', 'listClientCampaign.ts');
		return;
	}

	res.status(200).send({ message: 'OK', OK: true, data: { clients: clients } });
}