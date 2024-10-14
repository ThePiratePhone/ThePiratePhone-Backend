import { Request, Response } from 'express';

import { Area } from '../../../Models/Area';
import { Caller } from '../../../Models/Caller';
import { log } from '../../../tools/log';
import { checkParameters, clearPhone, phoneNumberCheck } from '../../../tools/utils';

/**
 * change caller password
 *
 * @example
 * body:
 * {
 * 	"adminCode": string,
 * 	"newPassword": string,
 * 	"Callerphone": string,
 * 	"area": string
 * }
 */
export default async function changeCallerPassword(req: Request<any>, res: Response<any>) {
	const ip = req.hostname;
	if (
		!checkParameters(
			req.body,
			res,
			[
				['adminCode', 'string'],
				['newPassword', 'string'],
				['Callerphone', 'string'],
				['area', 'ObjectId']
			],
			__filename
		)
	)
		return;

	if (req.body.newPassword.length != 4 || Number.isNaN(parseInt(req.body.newPassword))) {
		res.status(400).send({ message: 'Invalid new pin code', OK: false });
		log(`Invalid new pin code from: ` + ip, 'WARNING', __filename);
		return;
	}
	const area = await Area.findOne({ adminPassword: { $eq: req.body.adminCode }, _id: { $eq: req.body.area } });
	if (!area) {
		res.status(401).send({ message: 'Wrong admin code', OK: false });
		log(`Wrong admin code from ` + ip, 'WARNING', __filename);
		return;
	}

	const phone = clearPhone(req.body.Callerphone);
	if (!phoneNumberCheck(phone)) {
		res.status(400).send({ message: 'Invalid phone number', OK: false });
		log(`Invalid phone number from ` + ip, 'WARNING', __filename);
		return;
	}
	const result = await Caller.updateOne({ phone: phone, area: area._id }, { pinCode: { $eq: req.body.newPassword } });
	if (result.matchedCount != 1) {
		res.status(404).send({ message: 'Caller not found or same password', OK: false });
		log(`Caller not found or same password from ${area.name} admin (${ip})`, 'WARNING', __filename);
		return;
	}

	res.status(200).send({ message: 'Password changed', OK: true });
	log(`Password of ${phone} changed from ${area.name} admin (${ip})`, 'INFO', __filename);
}
