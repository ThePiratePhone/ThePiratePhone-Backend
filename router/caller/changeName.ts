import { Request, Response } from 'express';

import { Caller } from '../../Models/Caller';
import { log } from '../../tools/log';
import { checkParameters, checkPinCode, clearPhone, phoneNumberCheck, sanitizeString } from '../../tools/utils';

/**
 * Change caller name
 * @example
 * body:{
 * 	"phone": string,
 * 	"pinCode": string  {max 4 number},
 * 	"newName": string,
 * 	"area": mongoDBID
 * }
 * @throws {400}: missing parameters,
 * @throws {400}: Wrong phone number
 * @throws {400}: Wrong newName (empty)
 * @throws {400}: Caller not found
 * @throws {200}: Caller name changed
 */
export default async function ChangeName(req: Request<any>, res: Response<any>) {
	const ip =
		typeof req.headers['x-forwarded-for'] === 'string' ? req.headers['x-forwarded-for'].split(',')[0] : req.ip;

	if (
		!checkParameters(
			req.body,
			res,
			[
				['phone', 'string'],
				['pinCode', 'string'],
				['newName', 'string'],
				['area', 'ObjectId']
			],
			__filename
		)
	)
		return;

	if (!checkPinCode(req.body.pinCode, res, __filename)) return;

	req.body.phone = clearPhone(req.body.phone);
	if (!phoneNumberCheck(req.body.phone)) {
		res.status(400).send({ message: 'Wrong phone number', OK: false });
		log('Wrong phone number from ' + ip, 'WARNING', __filename);
		return;
	}

	if (req.body.newName.trim() == '') {
		res.status(400).send({ message: 'Wrong newName', OK: false });
		log('Wrong newName from ' + ip, 'WARNING', __filename);
		return;
	}

	req.body.newName = sanitizeString(req.body.newName);

	const change = await Caller.updateOne(
		{ phone: { $eq: req.body.phone }, pinCode: { $eq: req.body.pinCode }, area: { $eq: req.body.area } },
		{ $set: { name: req.body.newName } }
	);
	if (change.matchedCount != 1) {
		res.status(400).send({ message: 'Caller not found', OK: false });
		log('Caller not found from ' + ip, 'WARNING', __filename);
		return;
	}

	res.status(200).send({ message: 'Caller name changed', OK: true });
	log('Caller name changed from ' + ip, 'INFO', __filename);
}
