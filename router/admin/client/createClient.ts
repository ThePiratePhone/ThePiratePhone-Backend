import { Request, Response } from 'express';

import { Area } from '../../../Models/Area';
import { Client } from '../../../Models/Client';
import { log } from '../../../tools/log';
import { checkParameters, clearPhone, hashPasword, phoneNumberCheck, sanitizeString } from '../../../tools/utils';

/**
 * create a client
 *
 * @example
 * body:{
 * 	phone: string,
 * 	name: string,
 * 	adminCode: string,
 * 	pinCode: string,
 * 	area: string,
 *	"allreadyHased": boolean
 * }
 *
 * @throws {400} if missing parameters
 * @throws {400} bad hash for admin code
 * @throws {400} if wrong phone number
 * @throws {400} if wrong pin code
 * @throws {401} if wrong admin code
 * @throws {401} if user already exist
 * @throws {500} if internal server error
 * @throws {200} if OK
 */
export default async function createClient(req: Request<any>, res: Response<any>) {
	//@ts-ignore
	const ip = req.headers['x-forwarded-for']?.split(',')?.at(0) ?? req.ip;
	if (
		!checkParameters(
			req.body,
			res,
			[
				['phone', 'string'],
				['name', 'string'],
				['firstName', 'string', true],
				['institution', 'string', true],
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

	const phone = clearPhone(req.body.phone);
	if (!phoneNumberCheck(phone)) {
		res.status(400).send({ message: 'Wrong phone number', OK: false });
		log(`Wrong phone number from ${area.name} (${ip})`, 'WARNING', __filename);
		return;
	}

	if ((await Client.findOne({ phone: phone })) != null) {
		res.status(401).send({ message: 'User already exist', OK: false });
		log(`User already exist from ${area.name} (${ip})`, 'WARNING', __filename);
		return;
	}

	const user = new Client({
		name: sanitizeString(req.body.name),
		phone: phone,
		firstName: sanitizeString(req.body.firstName ?? ''),
		institution: sanitizeString(req.body.institution ?? ''),
		area: area._id
	});

	try {
		await user.save();
		res.status(200).send({ message: 'user ' + user.name + ' created', OK: true });
		log(`user ${user.name} created from ${area.name} (${ip})`, 'INFO', __filename);
	} catch (error: any) {
		res.status(500).send({ message: 'Internal server error', OK: false });
		log(`Internal server error: ${error.message} from ${area.name} (${ip})`, 'ERROR', __filename);
	}
}
