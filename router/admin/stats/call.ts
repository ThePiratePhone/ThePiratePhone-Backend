import { Request, Response } from 'express';

import { Area } from '../../../Models/Area';
import { Call } from '../../../Models/Call';
import { Campaign } from '../../../Models/Campaign';
import { Client } from '../../../Models/Client';
import { log } from '../../../tools/log';
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
	const ip =
		(Array.isArray(req.headers['x-forwarded-for'])
			? req.headers['x-forwarded-for'][0]
			: req.headers['x-forwarded-for']?.split(',')?.[0] ?? req.ip) ?? 'no IP';

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
		log(`[!${req.body.area}, ${ip}] Wrong Creantial`, 'WARNING', __filename);
		return;
	}

	let campaign;
	if (!req.body.CampaignId) campaign = await Campaign.findOne({ area: area.id, active: true });
	else campaign = await Campaign.findOne({ _id: { $eq: req.body.CampaignId }, area: area.id });

	if (!campaign || campaign == null) {
		res.status(404).send({ message: 'no campaign in progress or campaign not found', OK: false });
		log(`[${req.body.area}, ${ip}] No campaign in progress or campaign not found`, 'WARNING', __filename);
		return;
	}

	let totalCalled = Call.aggregate([
		{
			$match: {
				campaign: campaign._id
			}
		},
		{ $sort: { start: -1 } },
		{
			$group: {
				_id: '$client',
				status: { $first: '$status' }
			}
		},
		{
			$match: {
				status: false
			}
		}
	]);
	let totalToRecall = Call.aggregate([
		{
			$match: {
				campaign: campaign._id
			}
		},
		{ $sort: { start: -1 } },
		{
			$group: {
				_id: '$client',
				status: { $first: '$status' }
			}
		},
		{
			$match: {
				status: true
			}
		}
	]);
	let inProgress = Call.countDocuments({ campaign: campaign._id, satisfaction: { $eq: 'In progress' } });
	let totalUser = Client.countDocuments({ campaigns: campaign._id });
	res.status(200).send({
		message: 'OK',
		OK: true,
		data: {
			totalCalled: (await totalCalled).length,
			totalToRecall: (await totalToRecall).length,
			totalUser: await totalUser,
			inProgress: await inProgress
		}
	});

	log(`[${req.body.area}, ${ip}] call stats get`, 'INFO', __filename);
}
