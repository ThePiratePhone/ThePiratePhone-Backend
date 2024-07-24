import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';

import { Area } from '../../../Models/Area';
import { Campaign } from '../../../Models/Campaign';
import { log } from '../../../tools/log';

/**
 * Change the password of a campaign
 *
 * @example
 * body:{
 *	"adminCode": string,
 *	"newCampaignCode": string,
 *	"area": mongoDBID,
 *	"CampaignId": mongoDBID
 * }
 *
 * @throws {400} - Missing parameters
 * @throws {400} - Campaign not found
 * @throws {400} - Password invalid
 * @throws {401} - Wrong admin code
 * @throws {401} - Wrong campaign id
 * @throws {200} - OK
 */
export default async function changeCampaingPassword(req: Request<any>, res: Response<any>) {
	const ip = req.socket?.remoteAddress?.split(':').pop();
	if (
		!req.body ||
		typeof req.body.adminCode != 'string' ||
		typeof req.body.newCampaignCode != 'string' ||
		!ObjectId.isValid(req.body.area) ||
		(req.body.CampaignId && !ObjectId.isValid(req.body.CampaignId))
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

	if (req.body.newCampaignCode.length < 4 || req.body.newCampaignCode.length > 20) {
		res.status(400).send({ message: 'Password invalid', OK: false });
		log(`Password invalid from ${ip} (${area.name})`, 'WARNING', __filename);
		return;
	}

	const output = await Campaign.updateOne({ _id: campaign._id }, { password: req.body.newCampaignCode });
	if (output.matchedCount != 1) {
		res.status(400).send({ message: 'Campaign not found', OK: false });
		log(`Campaign not found from ${ip}`, 'WARNING', __filename);
		return;
	}

	res.status(200).send({ message: 'OK', OK: true });
	log(`Campaign password changed from ${ip} (${area.name})`, 'INFO', __filename);
}
