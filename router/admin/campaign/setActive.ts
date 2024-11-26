import { Request, Response } from 'express';
import { Area } from '../../../Models/Area';
import { Campaign } from '../../../Models/Campaign';
import { log } from '../../../tools/log';
import { checkParameters, hashPasword } from '../../../tools/utils';

/**
 * set active campaign
 *
 * @example
 * body:
 * {
 * 	"adminCode": string,
 * 	"active": boolean,
 * 	"campaign": string,
 * 	"area": string,
 * 	"allreadyHaseded": boolean
 * }
 *
 * @throws {400} Missing parameters
 * @throws {400} bad hash for admin code
 * @throws {401} Wrong admin code
 * @throws {404} Campaign not found
 * @throws {200} Campaign activated
 * @throws {200} Campaign deactivated
 */
export default async function setActive(req: Request<any>, res: Response<any>) {
	//@ts-ignore
	const ip = req.headers['x-forwarded-for']?.split(',')?.at(0) ?? req.ip;
	if (
		!checkParameters(
			req.body,
			res,
			[
				['adminCode', 'string'],
				['active', 'boolean'],
				['campaign', 'string', true],
				['area', 'string'],
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
		log(`Wrong admin code from ${ip}`, 'WARNING', __filename);
		res.status(401).send({ message: 'Wrong admin code', OK: false });
		return;
	}

	//unacactive actual campaign
	if (req.body.campaign) {
		await Campaign.updateOne({ _id: { $eq: req.body.campaign }, area: area._id }, { active: false });
	} else {
		await Campaign.updateOne({ area: area._id, active: true }, { active: false });
	}
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

	if ((await Campaign.countDocuments({ area: area._id, active: true })) > 1) {
		await Campaign.updateOne({ area: area._id, active: true }, { active: false });
		log(`Multiple active campaign from ${area.name} admin (${ip})`, 'WARNING', __filename);
		res.status(500).send({ message: 'Multiple active campaign', OK: false });
		return;
	}

	if (req.body.active) {
		log(`Campaign activated from ${area.name} admin (${ip})`, 'INFO', __filename);
		res.status(200).send({ message: 'Campaign activated', OK: true });
		return;
	} else {
		log(`Campaign desactivated from ${area.name} admin (${ip})`, 'INFO', __filename);
		res.status(200).send({ message: 'Campaign desactivated', OK: true });
	}
}
