import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';

import { Area } from '../../../Models/Area';
import { Client } from '../../../Models/Client';
import { log } from '../../../tools/log';
import { checkParameters, clearPhone, hashPasword } from '../../../tools/utils';

/**
 * Search for clients by phone
 *
 * @example
 * body: {
 * 	phone: String,
 * 	adminCode: String,
 * 	area: ObjectId,
 *	"allreadyHased": boolean
 * }
 *
 * @throws {400} Missing parameters
 * @throws {400} bad hash for admin code
 * @throws {401} Wrong admin code
 * @throws {200} OK
 */
export default async function SearchByPhone(req: Request<any>, res: Response<any>) {
	const ip = req.hostname;
	if (
		!checkParameters(
			req.body,
			res,
			[
				['phone', 'string'],
				['adminCode', 'string'],
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

	const output = await Client.find({ phone: { $regex: req.body.phone, $options: 'i' } }, ['name', 'phone']).limit(10);
	res.status(200).send({ message: 'OK', OK: true, data: output });
	log(`Clients searched from ${ip} (${area.name})`, 'INFO', __filename);
}
