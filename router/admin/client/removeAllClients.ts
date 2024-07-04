import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';

import { log } from '../../../tools/log';
import { Area } from '../../../Models/Area';
import { Client } from '../../../Models/Client';
import { Campaign } from '../../../Models/Campaign';
import { Call } from '../../../Models/Call';

/**
 * remove all clients from a campaign
 *
 * @example
 * body: {
 * 	adminCode: string,
 * 	area: string,
 * 	CampaignId?: string
 * }
 *
 * @throws {400} if missing parameters
 * @throws {401} if wrong admin code
 * @throws {401} if wrong campaign id
 * @throws {500} if error removing clients
 * @throws {200} if OK
 */
export default async function removeAllClients(req: Request<any>, res: Response<any>) {
	const ip = req.socket?.remoteAddress?.split(':').pop();
	if (
		!req.body ||
		typeof req.body.adminCode != 'string' ||
		!ObjectId.isValid(req.body.area) ||
		(req.body.CampaignId && !ObjectId.isValid(req.body.CampaignId))
	) {
		res.status(400).send({ message: 'Missing parameters', OK: false });
		log(`Missing parameters from ` + ip, 'WARNING', __filename);
		return;
	}

	const area = await Area.findOne({ AdminPassword: req.body.adminCode, _id: req.body.area });
	if (!area) {
		res.status(401).send({ message: 'Wrong admin code', OK: false });
		log(`Wrong admin code from ${ip}`, 'WARNING', __filename);
		return;
	}

	let campaign: InstanceType<typeof Campaign> | null = null;

	if (req.body.CampaignId) {
		campaign = await Campaign.findOne({ _id: req.body.CampaignId, Area: area._id });
	} else {
		campaign = await Campaign.findOne({ Area: area._id, active: true });
	}
	if (!campaign) {
		res.status(401).send({ message: 'Wrong campaign id', OK: false });
		log(`Wrong campaign id from ${area.name} (${ip})`, 'WARNING', __filename);
		return;
	}

	// find all call in progress (with client) in the campaign
	const calls = await Call.deleteMany({
		Campaign: campaign._id,
		$and: [{ Status: 'IN_PROGRESS' }]
	});
	if (!calls) {
		res.status(500).send({ message: 'Error removing clients', OK: false });
		log(`Error removing clients from ${ip} (${area.name})`, 'ERROR', __filename);
		return;
	}

	// remove all clients in the campaign
	const clients = await Client.deleteMany({
		Campaign: campaign._id
	});

	if (!clients) {
		res.status(500).send({ message: 'Error removing clients', OK: false });
		log(`Error removing clients from ${ip} (${area.name})`, 'ERROR', __filename);
		return;
	}

	res.status(200).send({ message: 'OK', OK: true });
	log(`Clients removed from ${ip} (${area.name})`, 'INFO', __filename);
}
