import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import { log } from '../../../tools/log';
import { Area } from '../../../Models/Area';
import { Campaign } from '../../../Models/Campaign';

/**
 * set active campaign
 *
 * @example
 * body:
 * {
 * 	"adminCode": string,
 * 	"active": boolean,
 * 	"campaign": string,
 * 	"area": string
 * }
 *
 * @throws {400} Missing parameters
 * @throws {401} Wrong admin code
 * @throws {404} Campaign not found
 * @throws {200} Campaign activated
 * @throws {200} Campaign deactivated
 */
export default async function setActive(req: Request<any>, res: Response<any>) {
	const ip = req.socket?.remoteAddress?.split(':').pop();
	if (
		!req.body ||
		typeof req.body.adminCode != 'string' ||
		typeof req.body.active != 'boolean' ||
		(req.body.active && !ObjectId.isValid(req.body.campaign)) ||
		!ObjectId.isValid(req.body.area)
	) {
		log(`Missing parameters from ` + ip, 'WARNING', __filename);
		res.status(400).send({ message: 'Missing parameters', OK: false });
		return;
	}

	const area = await Area.findOne({ adminPassword: { $eq: req.body.adminCode }, _id: { $eq: req.body.area } });
	if (!area) {
		log(`Wrong admin code from ${ip}`, 'WARNING', __filename);
		res.status(401).send({ message: 'Wrong admin code', OK: false });
		return;
	}

	//unacactive actual campaign
	await Campaign.updateMany({ area: area._id }, { active: false });
	//active new campaign
	if (req.body.active) {
		const campaign = await Campaign.updateOne(
			{
				_id: { $eq: req.body.campaign },
				area: area._id
			},
			{ active: true }
		);
		if (campaign.matchedCount != 1) {
			log(`Campaign not found from ${area.name} admin (${ip})`, 'WARNING', __filename);
			res.status(404).send({ message: 'Campaign not found', OK: false });
			return;
		}
	}
	if (!req.body.active) {
		log(`Campaign activated from ${area.name} admin (${ip})`, 'INFO', __filename);
	} else {
		log(`Campaign deactivated from ${area.name} admin (${ip})`, 'INFO', __filename);
	}
}
