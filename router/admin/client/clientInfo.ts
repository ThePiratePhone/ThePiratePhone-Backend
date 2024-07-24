import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';

import { Area } from '../../../Models/Area';
import { Call } from '../../../Models/Call';
import { Caller } from '../../../Models/Caller';
import { Campaign } from '../../../Models/Campaign';
import { Client } from '../../../Models/Client';
import { log } from '../../../tools/log';
import { clearPhone, phoneNumberCheck } from '../../../tools/utils';

/**
 * get client info
 *
 * @example
 * body:{
 * 	phone: string,
 * 	adminCode: string,
 * 	area: string,
 * 	campaign: string
 * }
 *
 * @throws {400} if missing parameters
 * @throws {400} if wrong phone number
 * @throws {401} if wrong admin code
 * @throws {404} if user not found
 * @throws {404} if client not found
 * @throws {200} if OK
 * @throws {200} if no call found for this client
 */
export default async function clientInfo(req: Request<any>, res: Response<any>) {
	const ip = req.socket?.remoteAddress?.split(':').pop();
	if (
		!req.body ||
		typeof req.body.adminCode != 'string' ||
		typeof req.body.phone != 'string' ||
		!ObjectId.isValid(req.body.area) ||
		(req.body.campaign && !ObjectId.isValid(req.body.campaign))
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

	const area = await Area.findOne({ adminPassword: { $eq: req.body.adminCode }, _id: { $eq: req.body.area } });
	if (!area) {
		res.status(401).send({ message: 'Wrong admin code', OK: false });
		log(`Wrong admin code from ${ip}`, 'WARNING', __filename);
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
		log(`Campaign not found from ${area.name} (${ip})`, 'WARNING', __filename);
		return;
	}

	const client = await Client.findOne({ phone: req.body.phone, area: req.body.area });
	if (!client) {
		res.status(404).send({ message: 'User not found', OK: false });
		log(`User not found from ${area.name} (${ip})`, 'WARNING', __filename);
		return;
	}

	const clients = Caller.find({ client: client._id, area: area._id });
	if (!clients) {
		res.status(404).send({
			OK: true,
			data: { client: null, call: null },
			message: 'Client not found'
		});
		log(`Client not found from ${area.name} (${ip})`, 'WARNING', __filename);
		return;
	}
	const call = await Call.find({ client: client._id, area: area._id, campaign: campaign._id });
	if (!call) {
		res.status(200).send({
			OK: true,
			data: { client: client, call: null },
			message: 'no call found for this client'
		});
		log(`No call found for this client from ${area.name} (${ip})`, 'INFO', __filename);
		return;
	}

	const calls = await Promise.all(
		call.map(async c => {
			const caller = await Caller.findOne({ _id: c.caller, area: area._id });
			return { call: c, caller: caller };
		})
	);

	res.status(200).send({
		OK: true,
		data: { client: client, call: calls },
		message: 'Client info got'
	});
	log(`Client info got from ${area.name} (${ip})`, 'INFO', __filename);
}
