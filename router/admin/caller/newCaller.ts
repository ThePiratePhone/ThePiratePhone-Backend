import { Request, Response } from 'express';

import { Area } from '../../../Models/Area';
import { Caller } from '../../../Models/Caller';
import { log } from '../../../tools/log';
import { checkParameters, clearPhone, hashPasword, phoneNumberCheck, sanitizeString } from '../../../tools/utils';

/**
 * Create a new caller
 *
 * @example
 * body:{
 * {
 * 	"adminCode": string,
 * 	"phone": string,
 * 	"pinCode": string,
 * 	"name": string,
 * 	"area": string
 * }
 *
 * @throws {400}: Missing parameters
 * @throws {400}: adminCode is not a hash
 * @throws {400}: Invalid pin code
 * @throws {400}: Wrong phone number
 * @throws {400}: Invalid credentials
 * @throws {400}: caller already exist
 * @throws {500}: Internal error
 * @throws {200}: Caller {newCaller.name} created
 */
export default async function newCaller(req: Request<any>, res: Response<any>) {
	const ip = req.hostname;
	if (
		!checkParameters(
			req.body,
			res,
			[
				['adminCode', 'string'],
				['phone', 'string'],
				['pinCode', 'string'],
				['name', 'string'],
				['area', 'ObjectId'],
				['allreadyHased', 'boolean', true]
			],
			__filename
		)
	)
		return;

	if (req.body.pinCode.length != 4) {
		res.status(400).send({ message: 'Invalid pin code', OK: false });
		log(`Invalid pin code from ` + ip, 'WARNING', __filename);
		return;
	}

	const phone = clearPhone(req.body.phone);

	if (!phoneNumberCheck(phone)) {
		res.status(400).send({ message: 'Wrong phone number', OK: false });
		log('Wrong phone number', 'WARNING', __filename);
		return;
	}

	const password = hashPasword(req.body.adminCode, req.body.allreadyHased, res);
	if (!password) return;
	const area = await Area.findOne({ _id: { $eq: req.body.area }, adminPassword: password });
	if (!area) {
		res.status(400).send({ message: 'Invalid credentials', OK: false });
		log(`Invalid area from: ${phone} (${ip})`, 'WARNING', __filename);
		return;
	}

	if (await Caller.findOne({ phone: phone })) {
		res.status(400).send({ message: 'caller already exist', OK: false });
		log(`caller already exist from ${phone} (${ip})`, 'WARNING', __filename);
		return;
	}

	const newCaller = new Caller({
		name: sanitizeString(req.body.name),
		phone: phone,
		pinCode: req.body.pinCode,
		area: area._id
	});

	const result = await newCaller.save();
	if (!result) {
		res.status(500).send({ message: 'Internal error', OK: false });
		log(`Error while saving caller`, 'CRITICAL', __filename);
		return;
	}

	res.status(200).send({ message: `Caller ${newCaller.name} (${newCaller.phone}) created`, OK: true });
	log(`Caller ${newCaller.name} created from ${area.name} (${ip})`, 'INFO', __filename);
}
