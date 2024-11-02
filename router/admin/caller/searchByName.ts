import { Request, Response } from 'express';

import { Area } from '../../../Models/Area';
import { Caller } from '../../../Models/Caller';
import { log } from '../../../tools/log';
import { checkParameters, hashPasword, sanitizeString } from '../../../tools/utils';

function escapeRegExp(input: string): string {
	return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Search caller by name
 *
 * @example
 * body:
 * {
 * 	"adminCode": string,
 * 	"name": string,
 * 	"area": string,
 * 	"allreadyHaseded": boolean
 * }
 *
 * @throws {400}: Missing parameters
 * @throws {400}: adminCode is not a hash
 * @throws {401}: Wrong admin code
 * @throws {200}: OK
 */
export default async function SearchByName(req: Request<any>, res: Response<any>) {
	const ip = req.hostname;
	if (
		!checkParameters(
			req.body,
			res,
			[
				['adminCode', 'string'],
				['name', 'string'],
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

	const escapedNameParts = sanitizeString(req.body.name).split(' ').map(escapeRegExp);
	const regexParts = escapedNameParts.map(part => `(?=.*${part})`).join('');
	const regex = new RegExp(`^${regexParts}`, 'i');
	const output = await Caller.find({ name: regex }).limit(10);

	res.status(200).send({ message: 'OK', OK: true, data: output });
	log(`Caller searched from ${ip} (${area.name})`, 'INFO', __filename);
}
