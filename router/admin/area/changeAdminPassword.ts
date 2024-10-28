import { Request, Response } from 'express';

import { Area } from '../../../Models/Area';
import { log } from '../../../tools/log';
import { checkParameters, hashPasword, sanitizeString } from '../../../tools/utils';
import { sha512 } from 'js-sha512';

/**
 * change the users password of an area
 *
 * @example
 * body:
 * {
 * 	"adminCode": string,
 * 	"area": mongoDBID,
 * 	"newPassword": string,
 * 	"allreadyHased": boolean
 * }
 *
 * @throws {400}: new password is not a hash
 * @throws {400}: Missing parameters
 * @throws {400}: bad new admin password
 * @throws {404}: no area found
 * @throws {200}: password of area changed
 */
export default async function ChangeAdminPassword(req: Request<any>, res: Response<any>) {
	const ip = req.hostname;
	if (
		!checkParameters(
			req.body,
			res,
			[
				['adminCode', 'string'],
				['area', 'ObjectId'],
				['newPassword', 'string'],
				['allreadyHased', 'boolean', true]
			],
			ip
		)
	)
		return;

	if (req.body.newPassword.trim() == '') {
		res.status(400).send({ OK: false, message: 'bad new admin password' });
		log(`bad new admin password from ${ip}`, 'WARNING', __filename);
		return;
	}

	if (req.body.newPassword.length > 512) {
		//max size
		res.status(400).send({ OK: false, message: 'new password is too long (max 512)' });
		log(`new password is too long from ${ip}`, 'WARNING', __filename);
		return;
	}

	if (!req.body.allreadyHased || req.body.newPassword.length != 128) {
		//create hash
		req.body.newPassword = sha512(req.body.newPassword);
	} else {
		if (req.body.newPassword != sanitizeString(req.body.newPassword)) {
			res.status(400).send({ OK: false, message: 'new password is not a hash' });
			log(`new password is not a hash from ${ip}`, 'WARNING', __filename);
			return;
		}
	}

	const password = hashPasword(req.body.adminCode, req.body.allreadyHased, res);
	if (!password) return;
	const update = await Area.updateOne(
		{ _id: { $eq: req.body.area }, adminPassword: { $eq: password } },
		{ adminPassword: req.body.newPassword }
	);
	if (update.matchedCount != 1) {
		res.status(404).send({ OK: false, message: 'no area found' });
		log(`no area found from ${ip}`, 'WARNING', __filename);
		return;
	}

	res.status(200).send({ OK: true, message: 'password of area changed' });
	log(`admin password of area changed from ${ip}`, 'WARNING', __filename);
}
