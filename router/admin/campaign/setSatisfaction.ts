import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';

import { Area } from '../../../Models/Area';
import { Campaign } from '../../../Models/Campaign';
import { log } from '../../../tools/log';
import { sanitizeString } from '../../../tools/utils';

/**
 * Set the satisfaction of a campaign
 *
 * @example
 * body:{
 * 	"adminCode": string,
 * 	"satisfactions": string[],
 * 	"area": mongoDBID,
 * 	"CampaignId": mongoDBID
 * }
 *
 * @throws {400} - Missing parameters
 * @throws {400} - Invalid satisfaction satisfactions must be a array<string>
 * @throws {401} - Wrong admin code
 * @throws {401} - Wrong campaign id
 * @throws {200} - OK
 */
export default async function setSatisfaction(req: Request<any>, res: Response<any>) {
	const ip = req.hostname;
	if (
		!req.body ||
		typeof req.body.adminCode != 'string' ||
		!Array.isArray(req.body.satisfactions) ||
		(req.body.CampaignId && !ObjectId.isValid(req.body.CampaignId)) ||
		!ObjectId.isValid(req.body.area)
	) {
		res.status(400).send({ message: 'Missing parameters', OK: false });
		log(`Missing parameters from ` + ip, 'WARNING', __filename);
		return;
	}

	const area = await Area.findOne({ _id: { $eq: req.body.area }, adminPassword: { $eq: req.body.adminCode } });
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

	if (req.body.satisfactions && req.body.satisfactions.some((s: any) => typeof s != 'string')) {
		res.status(400).send({ message: 'Invalid satisfaction, satisfactions must be a array<string>', OK: false });
		log(`Invalid satisfaction from ${ip}`, 'WARNING', __filename);
		return;
	}

	req.body.satisfactions = req.body.satisfactions.map(sanitizeString);

	await Campaign.updateOne({ _id: campaign._id }, { status: req.body.satisfactions });
	res.status(200).send({ message: 'Satisfaction updated', OK: true });
	log(`Satisfaction updated from ${area.name} (${ip})`, 'INFO', __filename);
}
