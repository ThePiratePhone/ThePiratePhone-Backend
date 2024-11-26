import { Request, Response } from 'express';

import { Area } from '../../../Models/Area';
import { Caller } from '../../../Models/Caller';
import { Campaign } from '../../../Models/Campaign';
import { log } from '../../../tools/log';
import { checkParameters, clearPhone, hashPasword } from '../../../tools/utils';

/**
 * add one caller to a campaign
 *
 * @example
 * body: {
 * 	phone: string,
 * 	adminCode: string,
 * 	area: string,
 * 	campaign: string,
 * 	"allreadyHaseded": boolean
 * }
 *
 * @throws {400} if missing parameters
 * @throws {400} - bad hash for admin code
 * @throws {401} if wrong admin code
 * @throws {404} if caller not found
 * @throws {404} if campaign not found
 * @throws {500} if error adding caller to campaign
 * @throws {200} if caller already in campaign
 * @throws {200} if OK
 */
export default async function addCallerCampaign(req: Request<any>, res: Response<any>) {
	const ip = Array.isArray(req.headers['x-forwarded-for'])
		? req.headers['x-forwarded-for'][0]
		: req.headers['x-forwarded-for']?.split(',')?.[0] ?? req.ip;
	if (
		!checkParameters(
			req.body,
			res,
			[
				['phone', 'string'],
				['adminCode', 'string'],
				['area', 'string'],
				['campaign', 'string'],
				['allreadyHaseded', 'boolean', true]
			],
			__filename
		)
	)
		return;

	const password = hashPasword(req.body.adminCode, req.body.allreadyHaseded, res);
	if (!password) return;
	const area = await Area.findOne({ adminPassword: { $eq: password }, _id: { $eq: req.body.area } }, ['name']);
	if (!area) {
		res.status(401).send({ message: 'Wrong admin code', OK: false });
		log(`Wrong admin code from ` + ip, 'WARNING', __filename);
		return;
	}

	req.body.phone = clearPhone(req.body.phone);

	const caller = await Caller.findOne({ phone: { $eq: req.body.phone }, area: area._id }, ['campaigns']);
	if (!caller) {
		res.status(404).send({ message: 'Caller not found', OK: false });
		log(`Caller not found from ${area.name} (${ip})`, 'WARNING', __filename);
		return;
	}

	const campaign = await Campaign.findOne({ _id: { $eq: req.body.campaign }, area: area._id }, ['_id']);
	if (!campaign) {
		res.status(404).send({ message: 'Campaign not found', OK: false });
		log(`Campaign not found from ${area.name} (${ip})`, 'WARNING', __filename);
		return;
	}

	if (caller.campaigns.includes(campaign._id)) {
		res.status(200).send({ message: 'Caller already in campaign', OK: true });
		log(`Caller already in campaign from ${area.name} (${ip})`, 'WARNING', __filename);
		return;
	}
	try {
		await caller.updateOne({ $push: { campaigns: campaign._id } });
	} catch (e) {
		res.status(500).send({ message: 'Error adding caller to campaign', OK: false });
		log(`Error adding caller to campaign from ${area.name} (${ip})`, 'ERROR', __filename);
		return;
	}
	res.status(200).send({ message: 'Caller added to campaign', OK: true });
	log(`Caller added to campaign from ${area.name} (${ip})`, 'INFO', __filename);
}
