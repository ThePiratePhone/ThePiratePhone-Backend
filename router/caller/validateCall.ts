import { Request, Response } from 'express';

import { Campaign } from '../../Models/Campaign';
import { Call } from '../../Models/Call';
import { Caller } from '../../Models/Caller';
import { Client } from '../../Models/Client';
import { log } from '../../tools/log';
import { checkParameters, checkPinCode, clearPhone, phoneNumberCheck, sanitizeString } from '../../tools/utils';

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
 * @throws {400}: satisfaction is not a valid number
 * @throws {403}: Invalid credential
 * @throws {404}: Client not found
 * @throws {403}: you dont call this client
 * @throws {200}: Call ended
 */
export default async function validateCall(req: Request<any>, res: Response<any>) {
	const ip = req.hostname;

	if (
		!checkParameters(
			req.body,
			res,
			[
				['phone', 'string'],
				['pinCode', 'string'],
				['area', 'ObjectId'],
				['satisfaction', 'number'],
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
		log(`Invalid caller phone number from:${ip}`, 'WARNING', __filename);
		return;
	}

	const phoneNumber = clearPhone(req.body.phoneNumber);
	if (!phoneNumberCheck(phoneNumber)) {
		res.status(400).send({ message: 'Invalid caller phone number', OK: false });
		log(`Invalid caller phone number from:${ip}`, 'WARNING', __filename);
		return;
	}

	const caller = await Caller.findOne(
		{ phone: phone, pinCode: { $eq: req.body.pinCode }, area: { $eq: req.body.area } },
		['name']
	);
	if (!caller) {
		res.status(403).send({ message: 'Invalid credential', OK: false });
		log(`Invalid credential from: ${phone} (${ip})`, 'WARNING', __filename);
		return;
	}

	const campaign = await Campaign.findOne({ active: true, area: { $eq: req.body.area } }, ['status']);
	if (!campaign) {
		res.status(404).send({ message: 'Campaign not found', OK: false });
		log(`Campaign not found from: ${phone} (${ip})`, 'WARNING', __filename);
		return;
	}

	const client = await Client.findOne({ phone: phoneNumber }, ['_id']);
	if (!client || !client._id || client == null) {
		res.status(404).send({ message: 'Client not found', OK: false });
		log(`Client not found from: ${phone} (${ip})`, 'WARNING', __filename);
		return;
	}

	const call = await Call.findOne({
		caller: caller._id,
		client: client._id
	});
	if (!call) {
		res.status(403).send({ message: 'you dont call this client', OK: false });
		log(`you dont call this client from: ${phone} (${ip})`, 'WARNING', __filename);
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
	log(`Call ended from: ${phoneNumber} (${ip})`, 'INFO', __filename);
}
