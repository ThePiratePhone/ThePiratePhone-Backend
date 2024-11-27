import { Request, Response } from 'express';

import { Area } from '../../../Models/Area';
import { Call } from '../../../Models/Call';
import { Campaign } from '../../../Models/Campaign';
import { log } from '../../../tools/log';
import { checkParameters, hashPasword } from '../../../tools/utils';

export default async function response(req: Request<any>, res: Response<any>) {
	const ip =
		(Array.isArray(req.headers['x-forwarded-for'])
			? req.headers['x-forwarded-for'][0]
			: req.headers['x-forwarded-for']?.split(',')?.[0] ?? req.ip) ?? 'no IP';
	if (
		!checkParameters(
			req.body,
			res,
			[
				['CampaignId', 'string', true],
				['adminCode', 'string'],
				['area', 'string'],
				['allreadyHaseded', 'boolean', true]
			],
			__filename
		)
	)
		return;

	const password = hashPasword(req.body.adminCode, req.body.allreadyHaseded, res);
	if (!password) return;
	const area = await Area.findOne({ _id: { $eq: req.body.area }, adminPassword: { $eq: password } }, ['name']);
	if (!area) {
		res.status(401).send({ message: 'Wrong Credentials', OK: false });
		log('Wrong Creantial from ' + ip, 'WARNING', __filename);
		return;
	}

	let campaign;
	if (!req.body.CampaignId) campaign = await Campaign.findOne({ area: area.id, active: true }, ['status']);
	else campaign = await Campaign.findOne({ _id: { $eq: req.body.CampaignId }, area: area.id }, ['status']);

	if (!campaign || campaign == null) {
		res.status(404).send({ message: 'no campaign in progress or campaign not found', OK: false });
		log(`No campaign in progress or campaign not found from: ${area.name} (${ip})`, 'WARNING', __filename);
		return;
	}

	let clientCalled = await Call.countDocuments({ campaign: campaign._id });

	let callStatus = campaign.status.map(async status => {
		return {
			status,
			count: await Call.countDocuments({ campaign: campaign._id, satisfaction: status.name })
		};
	});
	res.status(200).send({
		message: 'OK',
		OK: true,
		data: {
			clientCalled,
			callStatus: await Promise.all(callStatus)
		}
	});

	log(`response stats get by ${area.name} (${ip})`, 'INFO', __filename);
}
