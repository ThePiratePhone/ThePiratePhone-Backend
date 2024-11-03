import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';

import { Area } from '../../../Models/Area';
import { Call } from '../../../Models/Call';
import { Caller } from '../../../Models/Caller';
import { Campaign } from '../../../Models/Campaign';
import { Client } from '../../../Models/Client';
import { log } from '../../../tools/log';
import { checkParameters, clearPhone, hashPasword, phoneNumberCheck } from '../../../tools/utils';

/**
 * get client info
 *
 * @example
 * body:{
 * 	phone: string,
 * 	adminCode: string,
 * 	area: string,
 * 	campaign: string,
 *	"allreadyHased": boolean
 * }
 *
 * @throws {400} if missing parameters
 * @throws {400} - bad hash for admin code
 * @throws {400} if wrong phone number
 * @throws {401} if wrong admin code
 * @throws {404} if user not found
 * @throws {404} if client not found
 * @throws {200} if OK
 * @throws {200} if no call found for this client
 */
export default async function clientInfo(req: Request<any>, res: Response<any>) {
	const ip = req.hostname;
	if (
		!checkParameters(
			req.body,
			res,
			[
				['adminCode', 'string'],
				['phone', 'string'],
				['area', 'string'],
				['campaign', 'string', true],
				['allreadyHaseded', 'boolean', true]
			],
			__filename
		)
	)
		return;

	const phone = clearPhone(req.body.phone);
	if (!phoneNumberCheck(phone)) {
		res.status(400).send({ message: 'Wrong phone number', OK: false });
		log(`Wrong phone number from ${ip}`, 'WARNING', __filename);
		return;
	}

	const password = hashPasword(req.body.adminCode, req.body.allreadyHaseded, res);
	if (!password) return;
	const area = await Area.findOne({ adminPassword: { $eq: password }, _id: { $eq: req.body.area } });
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

	const client = await Client.findOne({ phone: phone, campaigns: campaign._id });
	if (!client) {
		res.status(404).send({ message: 'Client not found', OK: false });
		log(`Client not found from ${area.name} (${ip})`, 'WARNING', __filename);
		return;
	}

	const call = await Call.find({ client: client._id, campaign: campaign._id, duration: { $ne: null } });
	if (!call || call.length === 0) {
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
