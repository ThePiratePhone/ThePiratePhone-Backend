import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';

import { Area } from '../../../Models/Area';
import { log } from '../../../tools/log';
import { sanitizeString } from '../../../tools/utils';

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
 * @throws {400}: bad new name
 * @throws {404}: no area found
 * @throws {200}: name of area changed
 */
export default async function ChangeName(req: Request<any>, res: Response<any>) {
	const ip = req.socket?.remoteAddress?.split(':').pop();
	if (
		!req.body ||
		typeof req.body.adminCode != 'string' ||
		!ObjectId.isValid(req.body.area) ||
		typeof req.body.newName != 'string'
	) {
		res.status(400).send({ message: 'Missing parameters', OK: false });
		log(`Missing parameters from ` + ip, 'WARNING', __filename);
		return;
	}
	req.body.newName = req.body.newName.trim();
	if (req.body.newName == '' || req.body.newName.length > 50) {
		res.status(400).send({ OK: false, message: 'bad new name' });
		log(`bad new name from ${ip}`, 'WARNING', __filename);
		return;
	}

	req.body.newName = sanitizeString(req.body.newName);
	const update = await Area.updateOne(
		{ _id: { $eq: req.body.area }, adminPassword: { $eq: req.body.adminCode } },
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
