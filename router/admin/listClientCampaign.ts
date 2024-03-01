import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';

import { Area } from '../../Models/Area';
import { Campaign } from '../../Models/Campaign';
import { Client } from '../../Models/Client';
import { log } from '../../tools/log';

export default async function listClientCampaign(req: Request<any>, res: Response<any>) {
	const ip = req.socket?.remoteAddress?.split(':').pop();
	if (
		!req.body ||
		typeof req.body.adminCode != 'string' ||
		!ObjectId.isValid(req.body.CampaignId) ||
		(req.body.skip && typeof req.body.skip != 'number') ||
		(req.body.limit && typeof req.body.limit != 'number') ||
		!ObjectId.isValid(req.body.area)
	) {
		res.status(400).send({ message: 'Missing parameters', OK: false });
		log(`Missing parameters from: ` + ip, 'WARNING', 'listClientCampaign.ts');
		return;
	}

	const area = await Area.findOne({ AdminPassword: req.body.adminCode, _id: req.body.area });
	if (!area) {
		res.status(401).send({ message: 'Wrong admin code', OK: false });
		log(`Wrong admin code from ` + ip, 'WARNING', 'listClientCampaign.ts');
		return;
	}

	const campaign = await Campaign.findOne({ _id: req.body.CampaignId, Area: area._id });
	if (!campaign) {
		res.status(401).send({ message: 'Wrong campaign id', OK: false });
		log(`Wrong campaign id from ${area.name} (${ip})`, 'WARNING', 'listClientCampaign.ts');
		return;
	}

	const numberOfClients = await Client.countDocuments({ data: { $elemMatch: { $eq: campaign._id.toString() } } });
	const clients = await Client.find({ data: { $elemMatch: { $eq: campaign._id.toString() } } })
		.skip(req.body.skip ? req.body.skip : 0)
		.limit(req.body.limit ? req.body.limit : 50);
	if (!clients) {
		res.status(401).send({ message: 'No clients found', OK: false });
		log(`No clients found from${area.name} (${ip})`, 'WARNING', 'listClientCampaign.ts');
		return;
	}

	res.status(200).send({ message: 'OK', OK: true, data: { clients: clients, numberOfClients: numberOfClients } });
	log(`client list campaign send to ${area.name} (${ip})`, 'INFORMATION', 'listClientCampaign.ts');
}
