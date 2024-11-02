import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';

import { Area } from '../../../Models/Area';
import { log } from '../../../tools/log';
import { Caller } from '../../../Models/Caller';
import { checkParameters, clearPhone, hashPasword } from '../../../tools/utils';

/**
 * Search caller by phone number
 *
 * @example
 * body:
 * {
 * 	"adminCode": string,
 * 	"phone": string,
 * 	"area": string
 * }
 *
 * @throws {400}: Missing parameters
 * @throws {400}: adminCode is not a hash
 * @throws {401}: Wrong admin code
 * @throws {200}: OK
 */
export default async function SearchByPhone(req: Request<any>, res: Response<any>) {
	const ip = req.hostname;
	if (
		!checkParameters(
			req.body,
			res,
			[
				['adminCode', 'string'],
				['phone', 'string'],
				['area', 'string'],
				['allreadyHaseded', 'boolean', true]
			],
			__filename
		)
	)
		return;
	const password = hashPasword(req.body.adminCode, req.body.allreadyHaseded, res);
	if (!password) return;
	const area = await Area.findOne({ adminPassword: { $eq: password }, _id: { $eq: req.body.area } });
	if (!area) {
		res.status(401).send({ message: 'Wrong admin code', OK: false });
		log(`Wrong admin code from ${ip}`, 'WARNING', __filename);
		return;
	}

	req.body.phone = clearPhone(req.body.phone);
	req.body.phone = req.body.phone.match(/\d+/g)?.join('') || '';

	const output = await Caller.find({
		phone: { $regex: req.body.phone, $options: 'i' },
		area: { $eq: req.body.area }
	}).limit(10);
	res.status(200).send({ message: 'OK', OK: true, data: output });
	log(`caller searched from ${ip} (${area.name})`, 'INFO', __filename);
}
