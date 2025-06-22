import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import { Area } from '../../../Models/Area';
import { Caller } from '../../../Models/Caller';
import { Campaign } from '../../../Models/Campaign';
import { log } from '../../../tools/log';
import { checkParameters, hashPasword } from '../../../tools/utils';

/**
 * List all callers from a campaign
 *
 * @example
 * body:{
 *	adminCode: string,
 *	CampaignId: string,
 *	skip?: number,
 *	limit?: number,
 *	area: string
 * }
 *
 *	@throws {400} - Missing parameters
 * @throws {400} - bad hash for admin code
 *	@throws {401} - Wrong admin code
 *	@throws {401} - Wrong campaign id
 *	@throws {404} - No callers found
 *	@throws {200} - OK
 */
export default async function listCallerCampaign(req: Request<any>, res: Response<any>) {
	const ip =
		(Array.isArray(req.headers['x-forwarded-for'])
			? req.headers['x-forwarded-for'][0]
			: req.headers['x-forwarded-for']?.split(',')?.[0] ?? req.ip) ?? 'no IP';
	if (
		!checkParameters(
			req.body,
			res,
			[
				['adminCode', 'string'],
				['CampaignId', 'string'],
				['area', 'ObjectId'],
				['skip', 'number', true],
				['limit', 'number', true],
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
		log(`[!${req.body.area}, ${ip}] Wrong admin code`, 'WARNING', __filename);
		return;
	}

	const campaign = await Campaign.findOne({ _id: { $eq: req.body.CampaignId }, area: area._id });
	if (!campaign) {
		res.status(401).send({ message: 'Wrong campaign id', OK: false });
		log(`[${ip}, ${req.body.area}] Wrong campaign id`, 'WARNING', __filename);
		return;
	}

	const numberOfCallers = await Caller.countDocuments({ campaigns: campaign._id });

	const callers = await Caller.find({ campaigns: campaign._id })
		.skip(req.body.skip ? req.body.skip : 0)
		.limit(req.body.limit ? req.body.limit : 50);
	if (!callers || callers.length === 0) {
		res.status(404).send({ message: 'No callers found', OK: false });
		log(`[${ip}, ${req.body.area}] No callers found`, 'WARNING', __filename);
		return;
	}

	res.status(200).send({ message: 'OK', OK: true, data: { callers: callers, numberOfCallers: numberOfCallers } });
	log(`[${ip}, ${req.body.area}] Callers found`, 'INFO', __filename);
}
