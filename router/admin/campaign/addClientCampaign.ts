import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';

import { Area } from '../../../Models/Area';
import { Campaign } from '../../../Models/Campaign';
import { Client } from '../../../Models/Client';
import { log } from '../../../tools/log';
import { clearPhone } from '../../../tools/utils';

/**
 * Add a client to a campaign
 *
 * @example
 * body:{
 *	"adminCode": string,
 *	"area": mongoDBID,
 *	"phone": string,
 *	"campaign": mongoDBID
 * }
 *
 * @throws {400} - Missing parameters
 * @throws {401} - Wrong admin code
 * @throws {404} - User not found
 * @throws {404} - Campaign not found
 * @throws {200} - User added to campaign
 * @throws {200} - User already in campaign
 */

export default async function addClientCampaign(req: Request<any>, res: Response<any>) {
	console.log(!ObjectId.isValid(req.body.campaign), req.body.campaign);
	const ip = req.socket?.remoteAddress?.split(':').pop();
	if (
		!req.body ||
		(req.body.campaign && !ObjectId.isValid(req.body.campaign)) ||
		typeof req.body.phone != 'string' ||
		typeof req.body.adminCode != 'string' ||
		!ObjectId.isValid(req.body.area)
	) {
		res.status(400).send({ message: 'Missing parameters', OK: false });
		log(`Missing parameters from ` + ip, 'WARNING', __filename);
		return;
	}

	const area = await Area.findOne({ AdminPassword: req.body.adminCode, _id: req.body.area });
	if (!area) {
		res.status(401).send({ message: 'Wrong admin code', OK: false });
		log(`Wrong admin code from ` + ip, 'WARNING', __filename);
		return;
	}

	req.body.phone = clearPhone(req.body.phone);

	const client = await Client.findOne({ phone: req.body.phone });
	if (!client) {
		res.status(404).send({ message: 'User not found', OK: false });
		log(`User not found from ${area.name} (${ip})`, 'WARNING', __filename);
		return;
	}

	let campaign: InstanceType<typeof Campaign> | null = null;

	if (req.body.campaign) {
		campaign = await Campaign.findOne({ _id: { $eq: req.body.campaign }, area: area._id });
	} else {
		campaign = await Campaign.findOne({ area: area._id, active: true });
	}
	if (!campaign) {
		res.status(404).send({ message: 'Campaign not found', OK: false });
		log(`Campaign not found from ${area.name} (${ip})`, 'WARNING', 'addClientCampaign.ts');
		return;
	}
	if (client.campaigns.findIndex(c => c.toString() == campaign?._id.toString()) != -1) {
		res.status(200).send({ message: 'User already in campaign', OK: true });
		log(`User already in campaign from ${area.name} (${ip})`, 'WARNING', __filename);
		return;
	}

	client.campaigns.push(campaign._id);
	await client.save();

	res.status(200).send({ message: 'User added to campaign', OK: true });
	log(`User added to campaign from ${area.name} (${ip})`, 'INFO', __filename);
}
