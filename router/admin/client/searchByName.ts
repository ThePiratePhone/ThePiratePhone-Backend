import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';

import { Area } from '../../../Models/Area';
import { Client } from '../../../Models/Client';
import { log } from '../../../tools/log';
import { sanitizeString } from '../../../tools/utils';

function escapeRegExp(input: string): string {
	return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Search for clients by name
 *
 * @example
 * body: {
 * 	name: String,
 * 	adminCode: String,
 * 	area: ObjectId
 * }
 *
 * @throws {400} Missing parameters
 * @throws {401} Wrong admin code
 * @throws {200} OK
 */
export default async function SearchByName(req: Request<any>, res: Response<any>) {
	const ip = req.hostname;
	if (
		!req.body ||
		typeof req.body.name != 'string' ||
		typeof req.body.adminCode != 'string' ||
		!ObjectId.isValid(req.body.area)
	) {
		res.status(400).send({ message: 'Missing parameters', OK: false });
		log(`Missing parameters from ` + ip, 'WARNING', __filename);
		return;
	}

	const area = await Area.findOne({ adminPassword: { $eq: req.body.adminCode }, _id: { $eq: req.body.area } });
	if (!area) {
		res.status(401).send({ message: 'Wrong admin code', OK: false });
		log(`Wrong admin code from ${ip}`, 'WARNING', __filename);
		return;
	}

	const escapedNameParts = sanitizeString(req.body.name).split(' ').map(escapeRegExp);
	const regexParts = escapedNameParts.map(part => `(?=.*${part})`).join('');
	const regex = new RegExp(`^${regexParts}`, 'i');
	const output = await Client.find({ name: regex }, ['name', 'phone']).limit(10);

	res.status(200).send({ message: 'OK', OK: true, data: output });
	log(`Clients searched from ${ip} (${area.name})`, 'INFO', __filename);
}
