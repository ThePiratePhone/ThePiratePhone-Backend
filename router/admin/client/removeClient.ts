import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import { log } from '../../../tools/log';
import { Area } from '../../../Models/Area';
import { Client } from '../../../Models/Client';
import { Campaign } from '../../../Models/Campaign';
import { clearPhone, phoneNumberCheck } from '../../../tools/utils';
import { Call } from 'Models/Call';
/**
 * remove one client from the database
 *
 * @example
 * body: {
 * 	phone: string,
 * 	adminCode: string,
 * 	area: string,
 * 	CampaignId: string
 * }
 *
 * @throws {400} if missing parameters
 * @throws {400} if wrong phone number
 * @throws {401} if wrong admin code
 * @throws {401} if wrong campaign id
 * @throws {404} if client not found
 * @throws {500} if error removing client
 * @throws {200} if OK
 */
export default async function removeClient(req: Request<any>, res: Response<any>) {
	const ip = req.socket?.remoteAddress?.split(':').pop();
	if (
		!req.body ||
		typeof req.body.phone != 'string' ||
		typeof req.body.adminCode != 'string' ||
		!ObjectId.isValid(req.body.area) ||
		(req.body.CampaignId && !ObjectId.isValid(req.body.CampaignId))
	) {
		res.status(400).send({ message: 'Missing parameters', OK: false });
		log(`Missing parameters from ` + ip, 'WARNING', __filename);
		return;
	}

	req.body.phone = clearPhone(req.body.phone);
	if (!phoneNumberCheck(req.body.phone)) {
		res.status(400).send({ message: 'Wrong phone number', OK: false });
		log(`Wrong phone number from ${ip}`, 'WARNING', __filename);
		return;
	}

	const area = await Area.findOne({ AdminPassword: { $eq: req.body.adminCode }, _id: { $eq: req.body.area } });
	if (!area) {
		res.status(401).send({ message: 'Wrong admin code', OK: false });
		log(`Wrong admin code from ${ip}`, 'WARNING', __filename);
		return;
	}

	let campaign: InstanceType<typeof Campaign> | null = null;

	if (req.body.CampaignId) {
		campaign = await Campaign.findOne({ _id: { $eq: req.body.CampaignId }, Area: area._id });
	} else {
		campaign = await Campaign.findOne({ Area: area._id, Active: true });
	}
	if (!campaign) {
		res.status(401).send({ message: 'Wrong campaign id', OK: false });
		log(`Wrong campaign id from ${area.name} (${ip})`, 'WARNING', __filename);
		return;
	}

	const output = await Client.findOne({ phone: req.body.phone, area: area._id });
	if (!output) {
		res.status(404).send({ message: 'Client not found', OK: false });
		log(`Client not found from ${area.name} (${ip})`, 'WARNING', __filename);
		return;
	}
	try {
		await Call.deleteOne({ Client: output._id, Campaign: campaign._id, duration: null });
	} catch (e) {
		res.status(500).send({ message: 'Error removing client', OK: false });
		log(`Error removing client from ${area.name} (${ip})`, 'ERROR', __filename);
		return;
	}
	res.status(200).send({ message: 'OK', OK: true });
	log(`Client removed from ${ip} (${area.name})`, 'INFO', __filename);
}
