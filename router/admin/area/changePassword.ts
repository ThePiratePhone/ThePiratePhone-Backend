import { Request, Response } from 'express';

import { checkParameters, hashPasword, sanitizeString } from '../../../tools/utils';
import { Area } from '../../../Models/Area';
import { log } from '../../../tools/log';

/**
 * @example
 * body:
 * {
 * 	"adminCode": string,
 * 	"area": string,
 * 	"newPassword": string,
 * 	"allreadyHaseded": boolean
 * }
 *
 * @throws {400}: Missing parameters
 * @throws {400}: adminCode is not a hash
 * @throws {400}: bad new password
 * @throws {404}: no area found
 * @throws {200}: password of area changed
 * @throws {200}: OK
 */
export default async function ChangePasword(req: Request<any>, res: Response<any>) {
	const ip = req.hostname;
	if (
		!checkParameters(
			req.body,
			res,
			[
				['adminCode', 'string'],
				['area', 'string'],
				['newPassword', 'string']
			],
			__filename
		)
	)
		return;

	const passwordClient = sanitizeString(req.body.newPassword);
	if (passwordClient != req.body.newPassword.trim()) {
		res.status(400).send({ OK: false, message: 'bad new password (regex faled)' });
		log(`bad new password (regex faled) from ${ip}`, 'WARNING', __filename);
		return;
	}
	if (passwordClient == '') {
		res.status(400).send({ OK: false, message: 'bad new password' });
		log(`bad new password from ${ip}`, 'WARNING', __filename);
		return;
	}

	if (passwordClient.length > 32) {
		res.status(400).send({ OK: false, message: 'new password is too long (max 32)' });
		log(`new password is too long (max 32) from ${ip}`, 'WARNING', __filename);
		return;
	}

	const password = hashPasword(req.body.adminCode, req.body.allreadyHaseded, res);
	if (!password) return;
	const update = await Area.updateOne(
		{ _id: { $eq: req.body.area }, adminPassword: password },
		{ password: passwordClient }
	);
	if (update.matchedCount != 1) {
		res.status(404).send({ OK: false, message: 'no area found' });
		log(`no area found from ${ip}`, 'WARNING', __filename);
		return;
	}

	res.status(200).send({ OK: true, message: 'password of area changed' });
	log(`password of area changed from ${ip}`, 'WARNING', __filename);
}
