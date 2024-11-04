import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';

import { Area } from '../../../Models/Area';
import { Campaign } from '../../../Models/Campaign';
import { Client } from '../../../Models/Client';
import { log } from '../../../tools/log';
import { Call } from '../../../Models/Call';
import { checkParameters, hashPasword } from '../../../tools/utils';

/**
 * Get stats of call
 *
 * @example
 * body: {
 * 	CampaignId: ObjectId,
 * 	adminCode: String,
 * 	area: ObjectId,
 *	"allreadyHaseded": boolean
 * }
 *
 * @throws {400} Missing parameters
 * @throws {400} bad hash for admin code
 * @throws {401} Wrong Creantial
 * @throws {404} no campaign in progress or campaign not found
 * @throws {200} OK
 */
export default async function call(req: Request<any>, res: Response<any>) {
	const ip = req.hostname;

	if (
		!checkParameters(
			req.body,
			res,
			[
				['CampaignId', 'ObjectId', true],
				['adminCode', 'string'],
				['area', 'ObjectId'],
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
		res.status(401).send({ message: 'Wrong Creantial', OK: false });
		log('Wrong Creantial from ' + ip, 'WARNING', __filename);
		return;
	}

	let campaign;
	if (!req.body.CampaignId) campaign = await Campaign.findOne({ area: area.id, active: true });
	else campaign = await Campaign.findOne({ _id: { $eq: req.body.CampaignId }, area: area.id });

	if (!campaign || campaign == null) {
		res.status(404).send({ message: 'no campaign in progress or campaign not found', OK: false });
		log(`No campaign in progress or campaign not found from: ${area.name} (${ip})`, 'WARNING', __filename);
		return;
	}

	let totalCalled = Call.countDocuments({ campaign: campaign._id });
	let totalToRecall = Call.countDocuments({ campaign: campaign._id, status: true });
	let totalUser = Client.countDocuments({ campaigns: campaign._id });
	res.status(200).send({
		message: 'OK',
		OK: true,
		data: {
			totalCalled: await totalCalled,
			totalToRecall: await totalToRecall,
			totalUser: await totalUser
		}
	});

	log(`call stats get by ${area.name} (${ip})`, 'INFO', __filename);
}
