import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import { Area } from '../../../Models/Area';
import { Caller } from '../../../Models/Caller';
import { Campaign } from '../../../Models/Campaign';
import { log } from '../../../tools/log';

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
 *	@throws {401} - Wrong admin code
 *	@throws {401} - Wrong campaign id
 *	@throws {401} - No callers found
 *	@throws {200} - OK
 */
export default async function listCallerCampaign(req: Request<any>, res: Response<any>) {
	const ip = req.socket?.remoteAddress?.split(':').pop();
	if (
		!req.body ||
		typeof req.body.adminCode != 'string' ||
		!ObjectId.isValid(req.body.CampaignId) ||
		(req.body.skip && typeof req.body.skip != 'number') ||
		(req.body.limit && typeof req.body.limit != 'number') ||
		!ObjectId.isValid(req.body.area)
	) {
		res.status(400).send({ message: 'Missing parameters', OK: false });
		log(`Missing parameters from: ` + ip, 'WARNING', __filename);
		return;
	}

	const area = await Area.findOne({ adminPassword: { $eq: req.body.adminCode }, _id: { $eq: req.body.area } });
	if (!area) {
		res.status(401).send({ message: 'Wrong admin code', OK: false });
		log(`Wrong admin code from ` + ip, 'WARNING', __filename);
		return;
	}

	const campaign = await Campaign.findOne({ _id: { $eq: req.body.CampaignId }, Area: area._id });
	if (!campaign) {
		res.status(401).send({ message: 'Wrong campaign id', OK: false });
		log(`Wrong campaign id from ${area.name} (${ip})`, 'WARNING', __filename);
		return;
	}

	const numberOfCallers = await Caller.countDocuments({ campaigns: campaign._id });

	const callers = await Caller.find({ campaigns: campaign._id })
		.skip(req.body.skip ? req.body.skip : 0)
		.limit(req.body.limit ? req.body.limit : 50);
	if (!callers) {
		res.status(401).send({ message: 'No callers found', OK: false });
		log(`No callers found from ${area.name} (${ip})`, 'WARNING', __filename);
		return;
	}

	res.status(200).send({ message: 'OK', OK: true, data: { callers: callers, numberOfCallers: numberOfCallers } });
	log(`Callers found from ${area.name} (${ip})`, 'INFO', __filename);
}
