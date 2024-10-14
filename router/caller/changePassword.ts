import { Request, Response } from 'express';

import { Caller } from '../../Models/Caller';
import { log } from '../../tools/log';
import { checkParameters, checkPinCode, clearPhone } from '../../tools/utils';

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
	const ip = req.hostname;
	if (
		!checkParameters(
			req.body,
			res,
			[
				['phone', 'string'],
				['pinCode', 'string'],
				['newPin', 'string'],
				['area', 'ObjectId']
			],
			__filename
		)
	)
		return;

	if (!checkPinCode(req.body.pinCode, res, __filename)) return;

	const phone = clearPhone(req.body.phone);

	const caller = await Caller.findOne(
		{ phone: { $eq: phone }, pinCode: { $eq: req.body.pinCode }, area: { $eq: req.body.area } },
		['name']
	);
	if (!caller) {
		res.status(403).send({ message: 'Invalid credential', OK: false });
		log(`Invalid credential from: (${phone}) ${ip}`, 'WARNING', __filename);
		return;
	}

	if (typeof req.body.newPin !== 'string' || req.body.newPin.length != 4 || Number.isNaN(parseInt(req.body.newPin))) {
		res.status(400).send({ message: 'Invalid new pin code', OK: false });
		log(`Invalid new pin code from: (${phone}) ${ip}`, 'WARNING', __filename);
		return;
	}

	if (req.body.newPin != req.body.pinCode) {
		const result = await Caller.updateOne(
			{ phone: { $eq: phone }, pinCode: { $eq: req.body.pinCode } },
			{ pinCode: { $eq: req.body.newPin } }
		);

		if (result.modifiedCount == 0) {
			res.status(500).send({ message: 'Invalid database request', OK: false });
			log(`Invalid database request from: ${caller.name} (${ip})`, 'CRITICAL', __filename);
			return;
		}
	}

	res.status(200).send({ message: 'password changed', OK: true });
	log(`user ${phone} password chnaged from: ${caller.name} (${ip})`, 'INFO', __filename);
}
