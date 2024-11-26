import { Request, Response } from 'express';

import { Area } from '../../../Models/Area';
import { Campaign } from '../../../Models/Campaign';
import { log } from '../../../tools/log';
import { checkParameters, hashPasword } from '../../../tools/utils';

/**
 * Change the script of a campaign
 *
 * @example
 * body:{
 *	"adminCode": string,
 *	"newScript": string,
 *	"area": mongoDBID,
 *	"CampaignId": mongoDBID,
 *	"allreadyHaseded": boolean
 * }
 *
 * @throws {400} - Missing parameters
 * @throws {400} - bad hash for admin code
 * @throws {401} - Wrong admin code
 * @throws {401} - Wrong campaign id
 * @throws {401} - Wrong script id
 * @throws {200} - OK
 */
export default async function changeScript(req: Request<any>, res: Response<any>) {
	const ip =
		typeof req.headers['x-forwarded-for'] === 'string' ? req.headers['x-forwarded-for'].split(',')[0] : req.ip;
	if (
		!checkParameters(
			req.body,
			res,
			[
				['adminCode', 'string'],
				['newScript', 'string'],
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
	const area = await Area.findOne({ _id: { $eq: req.body.area }, adminPassword: { $eq: password } });
	if (!area) {
		res.status(401).send({ message: 'Wrong admin code', OK: false });
		log(`Wrong admin code from ${ip}`, 'WARNING', __filename);
		return;
	}

	let campaign: InstanceType<typeof Campaign> | null = null;

	if (req.body.CampaignId) {
		campaign = await Campaign.findOne({ _id: { $eq: req.body.CampaignId }, area: area._id });
	} else {
		campaign = await Campaign.findOne({ area: area._id, active: true });
	}
	if (!campaign) {
		res.status(401).send({ message: 'Wrong campaign id', OK: false });
		log(`Wrong campaign id from ${area.name} (${ip})`, 'WARNING', __filename);
		return;
	}

	if (req.body.newScript.trim() == '') {
		res.status(401).send({ message: 'Wrong script id', OK: false });
		log(`Wrong script from ${area.name} (${ip})`, 'WARNING', __filename);
		return;
	}

	const output = await Campaign.updateOne({ _id: { $eq: campaign._id } }, { script: req.body.newScript });
	if (output.matchedCount != 1) {
		res.status(400).send({ message: 'Campaign not found', OK: false });
		log(`Campaign not found from ${ip}`, 'WARNING', __filename);
		return;
	}

	res.status(200).send({ message: 'OK', OK: true });
	log(`Campaign script changed from ${ip} (${area.name})`, 'INFO', __filename);
}
