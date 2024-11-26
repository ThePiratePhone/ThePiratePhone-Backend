import { Request, Response } from 'express';

import { Area } from '../../../Models/Area';
import { Campaign } from '../../../Models/Campaign';
import { Client } from '../../../Models/Client';
import { log } from '../../../tools/log';
import { checkParameters, hashPasword, sanitizeString } from '../../../tools/utils';

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
 * 	area: ObjectId,
 *	"allreadyHased": boolean
 * }
 *
 * @throws {400} Missing parameters
 * @throws {400} bad hash for admin code
 * @throws {401} Wrong admin code
 * @throws {200} OK
 */
export default async function SearchByName(req: Request<any>, res: Response<any>) {
	//@ts-ignore
	const ip = req.headers['x-forwarded-for']?.split(',')?.at(0) ?? req.ip;
	if (
		!checkParameters(
			req.body,
			res,
			[
				['name', 'string'],
				['adminCode', 'string'],
				['area', 'string'],
				['CampaignId', 'string', true],
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

	let campaign: InstanceType<typeof Campaign> | null;
	if (req.body.CampaignId) {
		campaign = await Campaign.findOne({ _id: { $eq: req.body.CampaignId }, area: area._id });
	} else {
		campaign = await Campaign.findOne({ area: area._id, active: true });
	}

	const escapedNameParts = sanitizeString(req.body.name).split(' ').map(escapeRegExp);
	const regexParts = escapedNameParts.map(part => `(?=.*${part})`).join('');
	const regex = new RegExp(`^${regexParts}`, 'i');
	const output = await Client.find({ name: regex, campaigns: campaign }, ['name', 'phone']).limit(10);

	res.status(200).send({ message: 'OK', OK: true, data: output });
	log(`Clients searched from ${ip} (${area.name})`, 'INFO', __filename);
}
