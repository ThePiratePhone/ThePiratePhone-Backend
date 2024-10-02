import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';

import { Area } from '../../../Models/Area';
import { Campaign } from '../../../Models/Campaign';
import { log } from '../../../tools/log';

/**
 * List all campaign from an area
 *
 * @example
 * body:{
 *	"adminCode": string,
 *	"area": mongoDBID,
 *	"skip": number,
 *	"limit": number
 * }
 *
 * @throws {400} - Missing parameters
 * @throws {401} - Wrong admin code
 * @throws {200} - OK
 */

export default async function listCampaign(req: Request<any>, res: Response<any>) {
	const ip = req.hostname;
	if (
		!req.body ||
		typeof req.body.adminCode != 'string' ||
		(req.body.skip && typeof req.body.skip != 'number') ||
		(req.body.limit && typeof req.body.limit != 'number') ||
		!ObjectId.isValid(req.body.area)
	) {
		res.status(400).send({ message: 'Missing parameters', OK: false });
		log(`Missing parameters from: ` + ip, 'WARNING', 'listCampaign.ts');
		return;
	}

	const area = await Area.findOne({ adminPassword: { $eq: req.body.adminCode }, _id: { $eq: req.body.area } }, [
		'_id',
		'name'
	]);
	if (!area) {
		res.status(401).send({ message: 'Wrong admin code', OK: false });
		log(`Wrong admin code from ` + ip, 'WARNING', 'listCampaign.ts');
		return;
	}

	const numberOfCampaign = await Campaign.countDocuments({ area: area._id });
	const campaign = await Campaign.find({ area: area._id }, [
		'_id',
		'name',
		'active',
		'callHours',
		'timeBetweenCall',
		'numberMaxCall'
	])
		.skip(req.body.skip ? req.body.skip : 0)
		.limit(req.body.limit ? req.body.limit : 50);
	if (!campaign) {
		res.status(401).send({ message: 'no campaign', OK: false });
		log(`no campaign from ${area.name} (${ip})`, 'WARNING', 'listCampaign.ts');
		return;
	}

	res.status(200).send({ message: 'OK', OK: true, data: { campaign: campaign, numberOfCampaign: numberOfCampaign } });
	log(`list campaign from ${area.name} (${ip})`, 'INFO', 'listCampaign.ts');
}
