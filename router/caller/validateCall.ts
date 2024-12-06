import { Request, Response } from 'express';

import { Call } from '../../Models/Call';
import { Caller } from '../../Models/Caller';
import { Campaign } from '../../Models/Campaign';
import { Client } from '../../Models/Client';
import { log } from '../../tools/log';
import { checkParameters, checkPinCode, clearPhone, phoneNumberCheck } from '../../tools/utils';

/**
 * Validate inprogress call
 *
 * @example
 * body:{
 * 	"phone": string,
 * 	"pinCode": string  {max 4 number},
 * 	"area": string,
 * 	"satisfaction": number,
 * 	"status": boolean,
 * 	"phoneNumber": string,
 * 	"comment": string
 * }
 *
 * @throws {400}: Missing parameters
 * @throws {400}: Invalid pin code
 * @throws {400}: Invalid phone number
 * @throws {403}: Invalid satisfaction is not in campaign
 * @throws {403}: Invalid credential
 * @throws {404}: Client not found
 * @throws {403}: you dont call this client
 * @throws {200}: Call ended
 */
export default async function validateCall(req: Request<any>, res: Response<any>) {
	const ip =
		(Array.isArray(req.headers['x-forwarded-for'])
			? req.headers['x-forwarded-for'][0]
			: req.headers['x-forwarded-for']?.split(',')?.[0] ?? req.ip) ?? 'no IP';

	if (
		!checkParameters(
			req.body,
			res,
			[
				['phone', 'string'],
				['pinCode', 'string'],
				['area', 'ObjectId'],
				['satisfaction', 'string'],
				['status', 'boolean'],
				['phoneNumber', 'string'],
				['comment', 'string', true]
			],
			__filename
		)
	)
		return;

	if (!checkPinCode(req.body.pinCode, res, __filename)) return;

	const phone = clearPhone(req.body.phone);
	if (!phoneNumberCheck(phone)) {
		res.status(400).send({ message: 'Invalid caller phone number', OK: false });
		log(`[!${req.body.phone}, ${ip}] Invalid caller phone number`, 'WARNING', __filename);
		return;
	}

	const phoneNumber = clearPhone(req.body.phoneNumber);
	if (!phoneNumberCheck(phoneNumber)) {
		res.status(400).send({ message: 'Invalid caller phone number', OK: false });
		log(`[!${req.body.phone}, ${ip}] Invalid caller phone number`, 'WARNING', __filename);
		return;
	}

	const caller = await Caller.findOne(
		{ phone: phone, pinCode: { $eq: req.body.pinCode }, area: { $eq: req.body.area } },
		['name']
	);
	if (!caller) {
		res.status(403).send({ message: 'Invalid credential', OK: false });
		log(`[!${req.body.phone}, ${ip}] Invalid credential`, 'WARNING', __filename);
		return;
	}

	const campaign = await Campaign.findOne({ active: true, area: { $eq: req.body.area } }, ['status']);
	if (!campaign) {
		res.status(404).send({ message: 'Campaign not found', OK: false });
		log(`[${req.body.phone}, ${ip}] Campaign not found`, 'WARNING', __filename);
		return;
	}

	if (campaign.status.findIndex(e => e.name == req.body.satisfaction) == -1) {
		res.status(400).send({ message: 'satisfaction is not in campaign', data: campaign.status, OK: false });
		log(`[${req.body.phone}, ${ip}] satisfaction is not in campaign`, 'WARNING', __filename);
		return;
	}

	const client = await Client.findOne({ phone: phoneNumber }, ['_id']);
	if (!client || !client._id || client == null) {
		res.status(404).send({ message: 'Client not found', OK: false });
		log(`[${req.body.phone}, ${ip}] Client not found`, 'WARNING', __filename);
		return;
	}

	const call = await Call.findOne({
		caller: caller._id,
		client: client._id
	});
	if (!call) {
		res.status(403).send({ message: 'you dont call this client', OK: false });
		log(`[${req.body.phone}, ${ip}] you dont call this client`, 'WARNING', __filename);
		return;
	}

	const newCall = new Call({
		client: client._id,
		caller: caller._id,
		campaign: call.campaign,
		satisfaction: req.body.satisfaction ?? '',
		comment: req.body.comment ?? '',
		status: req.body.status ? true : false,
		duration: 0
	});
	await newCall.save();
	res.status(200).send({ message: 'Call ended', OK: true });
	log(`[${req.body.phone}, ${ip}] Call ended`, 'INFO', __filename);
}
