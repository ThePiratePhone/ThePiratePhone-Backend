import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';

import { log } from '../../tools/log';
import { clearPhone, phoneNumberCheck } from '../../tools/utils';
import { Caller } from '../../Models/Caller';
import { Call } from '../../Models/Call';

/**
 * allow a caller to give up a call
 *
 * @example
 * body:
 * {
 * 	"phone": string,
 * 	"pinCode": string  {max 4 number},
 * 	"area": string
 * }
 *
 * @throws {400}: Missing parameters
 * @throws {400}: Invalid phone number
 * @throws {403}: Invalid credential
 * @throws {404}: No call in progress
 * @throws {500}: Internal error
 * @throws {200}: Call ended
 */
export default async function giveUp(req: Request<any>, res: Response<any>) {
	const ip = req.socket?.remoteAddress?.split(':').pop();
	if (
		!req.body ||
		typeof req.body.phone != 'string' ||
		typeof req.body.pinCode != 'string' ||
		!ObjectId.isValid(req.body.area)
	) {
		res.status(400).send({ message: 'Missing parameters', OK: false });
		log(`Missing parameters from : ${ip}`, 'WARNING', 'giveUp.ts');
		return;
	}

	const phone = clearPhone(req.body.phone);
	if (!phoneNumberCheck(phone)) {
		res.status(400).send({ message: 'Invalid phone number', OK: false });
		log(`Invalid phone number from: ${ip}`, 'WARNING', 'giveUp.ts');
		return;
	}

	const caller = await Caller.findOne({ phone: phone, pinCode: { $eq: req.body.pinCode } }, ['name', 'phone']);
	if (!caller) {
		res.status(403).send({ message: 'Invalid credential', OK: false });
		log(`Invalid credential from: ${phone} (${ip})`, 'WARNING', 'giveUp.ts');
		return;
	}

	const currentCall = await Call.findOne({ Caller: caller._id, status: 'In progress' }, ['_id']);
	if (!currentCall) {
		res.status(404).send({ message: 'No call in progress', OK: false });
		log(`No call in progress from: ${phone} (${ip})`, 'WARNING', 'giveUp.ts');
		return;
	}

	await Call.deleteOne({ _id: currentCall._id });
	res.status(200).send({ message: 'Call ended', OK: true });
	log(`Call ended from: ${phone} (${ip})`, 'INFORMATION', 'giveUp.ts');
}
