import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';

import { Area } from '../../../Models/Area';
import { Campaign } from '../../../Models/Campaign';
import { Client } from '../../../Models/Client';
import { log } from '../../../tools/log';

/**
 * List all clients from a campaign
 *
 * @example
 * body:{
 *	adminCode: string,
 *	CampaignId?: string,
 *	skip?: number,
 *	limit?: number,
 *	area: string
 * }
 *
 *	@throws {400} - Missing parameters
 *	@throws {401} - Wrong admin code
 *	@throws {401} - Wrong campaign id
 *	@throws {401} - No clients found
 *	@throws {200} - OK
 */

export default async function listClientCampaign(req: Request<any>, res: Response<any>) {
	const ip = req.socket?.remoteAddress?.split(':').pop();
	if (
		!req.body ||
		typeof req.body.adminCode != 'string' ||
		(req.body.CampaignId && !ObjectId.isValid(req.body.CampaignId)) ||
		(req.body.skip && typeof req.body.skip != 'number') ||
		(req.body.limit && typeof req.body.limit != 'number') ||
		!ObjectId.isValid(req.body.area)
	) {
		res.status(400).send({ message: 'Missing parameters', OK: false });
		log(`Missing parameters from: ` + ip, 'WARNING', __filename);
		return;
	}

	const area = await Area.findOne({ adminPassword: { $eq: req.body.adminCode }, _id: { $eq: req.body.area } });
	if (!area) {
		res.status(401).send({ message: 'Wrong admin code', OK: false });
		log(`Wrong admin code from ` + ip, 'WARNING', __filename);
		return;
	}

	let campaign: InstanceType<typeof Campaign> | null = null;

	if (req.body.CampaignId) {
		campaign = await Campaign.findOne({ _id: { $eq: req.body.CampaignId }, area: area._id });
	} else {
		campaign = await Campaign.findOne({ area: area._id, active: true });
	}
	if (!campaign) {
		res.status(401).send({ message: 'Wrong campaign id', OK: false });
		log(`Wrong campaign id from ${area.name} (${ip})`, 'WARNING', __filename);
		return;
	}

	const numberOfClients = await Client.countDocuments({ ['data.' + campaign._id.toString()]: { $exists: true } });
	const clients = await Client.find({ ['data.' + campaign._id.toString()]: { $exists: true } })
		.skip(req.body.skip ? req.body.skip : 0)
		.limit(req.body.limit ? req.body.limit : 50);
	if (!clients) {
		res.status(401).send({ message: 'No clients found', OK: false });
		log(`No clients found from${area.name} (${ip})`, 'WARNING', __filename);
		return;
	}

	res.status(200).send({ message: 'OK', OK: true, data: { clients: clients, numberOfClients: numberOfClients } });
	log(`client list campaign send to ${area.name} (${ip})`, 'INFO', __filename);
}
