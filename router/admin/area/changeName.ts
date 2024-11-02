import { Request, Response } from 'express';

import { Area } from '../../../Models/Area';
import { log } from '../../../tools/log';
import { checkParameters, hashPasword, sanitizeString } from '../../../tools/utils';

/**
 * change the name of an area
 *
 * @example
 * body:
 * {
 * 	"adminCode": string,
 * 	"area": mongoDBID,
 * 	"newName": string
 * }
 *
 * @throws {400}: Missing parameters
 * @throws {400}: adminCode is not a hash
 * @throws {400}: bad new name
 * @throws {404}: no area found
 * @throws {200}: name of area changed
 */
export default async function ChangeName(req: Request<any>, res: Response<any>) {
	const ip = req.hostname;
	if (
		!checkParameters(
			req.body,
			res,
			[
				['adminCode', 'string'],
				['area', 'string'],
				['newName', 'string'],
				['allreadyHaseded', 'boolean', true]
			],
			__filename
		)
	)
		return;
	req.body.newName = req.body.newName.trim();
	if (req.body.newName == '' || req.body.newName.length > 50) {
		res.status(400).send({ OK: false, message: 'bad new name' });
		log(`bad new name from ${ip}`, 'WARNING', __filename);
		return;
	}

	req.body.newName = sanitizeString(req.body.newName);
	const password = hashPasword(req.body.adminCode, req.body.allreadyHaseded, res);
	if (!password) return;
	const update = await Area.updateOne(
		{ _id: { $eq: req.body.area }, adminPassword: password },
		{ name: req.body.newName }
	);
	if (update.matchedCount != 1) {
		res.status(404).send({ OK: false, message: 'no area found' });
		log(`no area found from ${ip}`, 'WARNING', __filename);
		return;
	}

	res.status(200).send({ OK: true, message: 'name of area changed' });
	log(`name of area changed to ${req.body.newName} from ${req.body.area} (${ip})`, 'WARNING', __filename);
}
