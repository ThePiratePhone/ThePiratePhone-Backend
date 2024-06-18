import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';

import { Caller } from '../../Models/Caller';
import { Campaign } from '../../Models/Campaign';
import { log } from '../../tools/log';
import { clearPhone, phoneNumberCheck } from '../../tools/utils';

/**
 *allow a caller to join a campaign
 *
 * @example
 * body:
 * {
 * 	"phone": string,
 * 	"pinCode": string  {max 4 number},
 * 	"campaignId": string,
 * 	"campaignPassword": string
 * }
 *
 * @throws {400}: Missing parameters
 * @throws {400}: Invalid phone number
 * @throws {403}: Invalid credential or incorrect campaing
 * @throws {404}: Campaign not found
 * @throws {403}: Already joined campaign
 * @throws {500}: Internal error
 * @throws {200}: Campaign joined
 */
export default async function joinCampaign(req: Request<any>, res: Response<any>) {
	const ip = req.socket?.remoteAddress?.split(':').pop();

	if (
		!req.body ||
		typeof req.body.phone != 'string' ||
		typeof req.body.pinCode != 'string' ||
		!ObjectId.isValid(req.body.campaignId) ||
		typeof req.body.campaignPassword != 'string' ||
		!ObjectId.isValid(req.body.area)
	) {
		res.status(400).send({ message: 'Missing parameters', OK: false });
		log(`Missing parameters from: ` + ip, 'WARNING', 'joinCampaign.ts');
		return;
	}

	const phone = clearPhone(req.body.phone);
	if (!phoneNumberCheck(phone)) {
		res.status(400).send({ message: 'Invalid phone number', OK: false });
		log(`Invalid phone number from: ${ip}`, 'WARNING', __filename);
		return;
	}

	const caller = await Caller.findOne(
		{ phone: phone, pinCode: { $eq: req.body.pinCode }, area: { $eq: req.body.area } },
		['name', 'campaigns', 'phone']
	);
	if (!caller) {
		res.status(403).send({ message: 'Invalid credential or incorrect campaing', OK: false });
		log(`Invalid credential or incorrect campaing from: ${phone} (${ip})`, 'WARNING', __filename);
		return;
	}

	const campaign = await Campaign.findOne(
		{
			_id: { $eq: req.body.campaignId },
			password: { $eq: req.body.campaignPassword },
			area: { $eq: req.body.area }
		},
		['id', 'name']
	);

	if (!campaign) {
		res.status(404).send({ message: 'Campaign not found', OK: false });
		log(`Campaign not found from ${caller.name} (${ip})`, 'WARNING', __filename);
		return;
	}

	if (caller.campaigns.includes(campaign.id)) {
		res.status(403).send({ message: 'Already joined campaign', OK: false });
		log(`Already joined campaign from ${caller.name} (${ip})`, 'WARNING', __filename);
		return;
	}

	try {
		caller.campaigns.push(campaign.id);
		await caller.save();
	} catch (e) {
		res.status(500).send({ message: 'Internal error', OK: false });
		log(`Internal error: ${e} from ${caller.name} (${ip})`, 'ERROR', __filename);
		return;
	}

	res.status(200).send({ message: 'Campaign joined', OK: true });
	log(`${caller.name} (${caller.phone}) join campain: ${campaign.name} from ${ip}`, 'INFO', __filename);
}
