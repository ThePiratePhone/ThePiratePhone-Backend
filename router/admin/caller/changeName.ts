import { Request, Response } from 'express';

import { Area } from '../../../Models/Area';
import { Caller } from '../../../Models/Caller';
import { log } from '../../../tools/log';
import { checkParameters, clearPhone, hashPasword, phoneNumberCheck, sanitizeString } from '../../../tools/utils';

/**
 * change caller name
 *
 * @example
 * body:
 * {
 * 	"adminCode": string,
 * 	"phone": string,
 * 	"newName": string,
 * 	"area": string
 * }
 *
 * @throws {400}: Missing parameters
 * @throws {400}: adminCode is not a hash
 * @throws {400}: Wrong phone number
 * @throws {401}: Wrong admin code
 * @throws {400}: Caller not found
 * @throws {200}: OK
 */
export default async function ChangeName(req: Request<any>, res: Response<any>) {
	const ip = req.hostname;

	if (
		!checkParameters(
			req.body,
			res,
			[
				['adminCode', 'string'],
				['phone', 'string'],
				['newName', 'string'],
				['area', 'ObjectId'],
				['allreadyHaseded', 'boolean', true]
			],
			__filename
		)
	)
		return;

	const phone = clearPhone(req.body.phone);
	if (!phoneNumberCheck(phone)) {
		res.status(400).send({ message: 'Wrong phone number', OK: false });
		log('Wrong phone number from ' + ip, 'WARNING', __filename);
		return;
	}
	req.body.newName = req.body.newName.trim();
	if (req.body.newName == '') {
		res.status(400).send({ message: 'Wrong newName', OK: false });
		log('Wrong newName from ' + ip, 'WARNING', __filename);
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

	req.body.newName = sanitizeString(req.body.newName);

	const change = await Caller.updateOne({ phone: phone, area: { $eq: req.body.area } }, { name: req.body.newName });
	if (change.matchedCount != 1) {
		res.status(400).send({ message: 'Caller not found', OK: false });
		log('Caller not found from ' + ip, 'WARNING', __filename);
		return;
	}

	res.status(200).send({ message: 'Caller name changed', OK: true });
	log('Caller name changed from ' + ip, 'INFO', __filename);
}
