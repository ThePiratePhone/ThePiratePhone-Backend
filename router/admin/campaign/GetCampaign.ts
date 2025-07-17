import { Request, Response } from 'express';

import { Area } from '../../../Models/Area';
import { Campaign } from '../../../Models/Campaign';
import { log } from '../../../tools/log';
import { checkParameters, hashPasword } from '../../../tools/utils';

/**
 * get a campaign
 *
 * @example
 * body:{
 * 	"adminCode": string,
 * 	"area": mongoDBID,
 * 	"CampaignId": mongoDBID,
 * 	"allreadyHaseded": boolean
 * }
 *
 * @throws {400} - Missing parameters
 * @throws {400} - bad hash for admin code
 * @throws {401} - Wrong admin code
 * @throws {404} - no campaign
 * @throws {200} - OK
 */
export default async function getCampaign(req: Request<any>, res: Response<any>) {
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
		log(`[!${req.body.area}, ${ip}] Wrong admin code`, 'WARNING', __filename);
		return;
	}
	const campaign = await Campaign.findOne({ area: area._id, _id: { $eq: req.body.CampaignId } }, [
		'_id',
		'name',
		'active',
		'callHoursStart',
		'callHoursEnd',
		'timeBetweenCall',
		'numberMaxCall',
		'script',
		'callPermited',
		'nbMaxCallCampaign',
		'satisfactions',
		'status',
		'sortGroup'
	]);
	if (!campaign) {
		res.status(404).send({ message: 'no campaign', OK: false });
		log(`[${ip}, ${req.body.area}] no campaign`, 'WARNING', __filename);
		return;
	}

	await campaign.updateOne(
		{ _id: campaign._id },
		{
			sortGroup: [
				{ name: 'prio1', id: 1 },
				{ name: 'prio2', id: 2 }
			]
		}
	);
	console.log(campaign);

	res.status(200).send({
		message: 'OK',
		OK: true,
		data: campaign
	});
	log(`[${ip}, ${req.body.area}] list campaign`, 'INFO', __filename);
}
