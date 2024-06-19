import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';

import { Area } from '../../../Models/Area';
import { log } from '../../../tools/log';
import { Caller } from '../../../Models/Caller';
import { clearPhone } from '../../../tools/utils';

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
 * @throws {401}: Wrong admin code
 * @throws {200}: OK
 */
export default async function SearchByPhone(req: Request<any>, res: Response<any>) {
	const ip = req.socket?.remoteAddress?.split(':').pop();
	if (
		!req.body ||
		typeof req.body.phone != 'string' ||
		typeof req.body.adminCode != 'string' ||
		!ObjectId.isValid(req.body.area)
	) {
		res.status(400).send({ message: 'Missing parameters', OK: false });
		log(`Missing parameters from ` + ip, 'WARNING', __filename);
		return;
	}

	const area = await Area.findOne({ AdminPassword: { $eq: req.body.adminCode }, _id: { $eq: req.body.area } });
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
