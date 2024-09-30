import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';

import { Call } from '../../Models/Call';
import { Caller } from '../../Models/Caller';
import { Client } from '../../Models/Client';
import { log } from '../../tools/log';
import { clearPhone, phoneNumberCheck, sanitizeString } from '../../tools/utils';

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
		!req.body ||
		typeof req.body.phone != 'string' ||
		typeof req.body.pinCode != 'string' ||
		!ObjectId.isValid(req.body.area) ||
		typeof req.body.satisfaction != 'number' ||
		typeof req.body.status != 'boolean' ||
		typeof req.body.phoneNumber != 'string' ||
		(req.body.comment && typeof req.body.comment != 'string')
	) {
		res.status(400).send({ message: 'Missing parameters', OK: false });
		log(`Missing parameters from: ` + ip, 'WARNING', __filename);
		return;
	}

	if (req.body.pinCode.length != 4) {
		res.status(400).send({ message: 'Invalid pin code', OK: false });
		log(`Invalid pin code from: ${ip}`, 'WARNING', __filename);
		return;
	}

	const phone = clearPhone(req.body.phone);
	if (!phoneNumberCheck(phone)) {
		res.status(400).send({ message: 'Invalid phone number', OK: false });
		log(`Invalid phone number from:${ip}`, 'WARNING', __filename);
		return;
	}

	const phoneNumber = clearPhone(req.body.phoneNumber);
	if (!phoneNumberCheck(phoneNumber)) {
		res.status(400).send({ message: 'Invalid client phone number', OK: false });
		log(`Invalid client phone number from:${ip}`, 'WARNING', __filename);
		return;
	}

	if (![-1, 0, 1, 2, 3].includes(req.body.satisfaction)) {
		res.status(400).send({ message: 'satisfaction is not a valid number', OK: false });
		log(`satisfaction is not a valid number from ` + ip, 'WARNING', __filename);
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
		Client: client._id,
		Caller: caller._id,
		campaign: call.campaign,
		satisfaction: sanitizeString(req.body.satisfaction),
		comment: sanitizeString(req.body.comment),
		status: req.body.status ? 'to recall' : 'Done',
		duration: 0
	});
	await newCall.save();
	res.status(200).send({ message: 'Call ended', OK: true });
	log(`Call ended from: ${phone} (${ip})`, 'INFO', __filename);
}
