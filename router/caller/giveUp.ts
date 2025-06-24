import { Request, Response } from 'express';

import { Call } from '../../Models/Call';
import { Caller } from '../../Models/Caller';
import { log } from '../../tools/log';
import { checkParameters, checkPinCode, clearPhone, phoneNumberCheck } from '../../tools/utils';

/**
 * allow a caller to give up a call
 *
 * @example
 * body:
 * {
 * 	"phone": string,
 * 	"pinCode": string  {max 4 number}
 * 	"area": mongoDBID
 * }
 *
 * @throws {400}: Missing parameters
 * @throws {400}: Invalid phone number
 * @throws {403}: Invalid credential or incorrect area
 * @throws {404}: No call in progress
 * @throws {500}: Internal error
 * @throws {200}: Call ended
 */
export default async function giveUp(req: Request<any>, res: Response<any>) {
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
				['area', 'ObjectId']
			],
			__filename
		)
	)
		return;

	if (!checkPinCode(req.body.pinCode, res, __filename)) return;

	const phone = clearPhone(req.body.phone);
	if (!phoneNumberCheck(phone)) {
		res.status(400).send({ message: 'Invalid phone number', OK: false });
		log(`[!${req.body.phone}, ${ip}] Invalid phone number`, 'WARNING', __filename);
		return;
	}

	const caller = await Caller.findOne(
		{ phone: phone, pinCode: { $eq: req.body.pinCode }, area: { $eq: req.body.area } },
		['name', 'phone']
	);
	if (!caller) {
		res.status(403).send({ message: 'Invalid credential or incorrect area', OK: false });
		log(`[!${req.body.phone}, ${ip}] Invalid credential or incorrect area`, 'WARNING', 'giveUp.ts');
		return;
	}

	const currentCall = await Call.findOne({ caller: caller._id, satisfaction: 'In progress' }, []);

	if (!currentCall) {
		res.status(404).send({ message: 'No call in progress', OK: false });
		log(`[${req.body.phone}, ${ip}] No call in progress`, 'WARNING', 'giveUp.ts');
		return;
	}

	await Call.deleteOne({ _id: currentCall._id });
	res.status(200).send({ message: 'Call ended', OK: true });
	log(`[${req.body.phone}, ${ip}] Call ended`, 'INFO', 'giveUp.ts');
}
