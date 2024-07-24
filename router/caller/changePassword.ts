import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';

import { Caller } from '../../Models/Caller';
import { log } from '../../tools/log';
import { clearPhone } from '../../tools/utils';

/**
 * Change the password of a caller
 * @example
 * body:{
 * 	"phone": string,
 * 	"pinCode": string  {max 4 number},
 * 	"newPin": string {max 4 number}
 * 	"area": mongoDBID
 * }
 * @throws {400}: Missing parameters
 * @throws {400}: Invalid pin code
 * @throws {400}: Invalid new pin code
 * @throws {403}: Invalid credential
 * @throws {500}: Invalid database request
 * @throws {200}: password changed
 *
 */
export default async function changePassword(req: Request<any>, res: Response<any>) {
	const ip = req.socket?.remoteAddress?.split(':').pop();
	if (
		!req.body ||
		typeof req.body.phone != 'string' ||
		typeof req.body.pinCode != 'string' ||
		!ObjectId.isValid(req.body.area) ||
		typeof req.body.newPin != 'string'
	) {
		res.status(400).send({ message: 'Missing parameters', OK: false });
		log(`Missing parameters from: ` + ip, 'WARNING', 'changePassword.ts');
		return;
	}

	if (req.body.pinCode.length != 4) {
		res.status(400).send({ message: 'Invalid pin code', OK: false });
		log(`Invalid pin code from: ` + ip, 'WARNING', 'createCaller.ts');
		return;
	}

	const phone = clearPhone(req.body.phone);

	const caller = await Caller.findOne(
		{ phone: { $eq: phone }, pinCode: { $eq: req.body.pinCode }, area: { $eq: req.body.area } },
		['name']
	);
	if (!caller) {
		res.status(403).send({ message: 'Invalid credential', OK: false });
		log(`Invalid credential from: (${phone}) ${ip}`, 'WARNING', 'changePassword.ts');
		return;
	}

	if (req.body.newPin.length != 4) {
		res.status(400).send({ message: 'Invalid new pin code', OK: false });
		log(`Invalid new pin code from: (${phone}) ${ip}`, 'WARNING', 'createCaller.ts');
		return;
	}

	if (req.body.newPin != req.body.pinCode) {
		const result = await Caller.updateOne(
			{ phone: { $eq: phone }, pinCode: { $eq: req.body.pinCode } },
			{ pinCode: req.body.newPin }
		);

		if (result.modifiedCount == 0) {
			res.status(500).send({ message: 'Invalid database request', OK: false });
			log(`Invalid database request from: ${caller.name} (${ip})`, 'CRITICAL', 'changePassword.ts');
			return;
		}
	}

	res.status(200).send({ message: 'password changed', OK: true });
	log(`user ${phone} password chnaged from: ${caller.name} (${ip})`, 'INFO', 'changePassword.ts');
}
