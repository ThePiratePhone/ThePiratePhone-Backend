import { Request, Response } from 'express';

import { Caller } from '../../Models/Caller';
import { Campaign } from '../../Models/Campaign';
import { log } from '../../tools/log';
import { checkParameters, checkPinCode, clearPhone, phoneNumberCheck } from '../../tools/utils';

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
	const ip =
		(Array.isArray(req.headers['x-forwarded-for'])
			? req.headers['x-forwarded-for'][0]
			: req.headers['x-forwarded-for']?.split(',')?.[0] ?? req.ip) ?? 'no IP';
	if (
		!checkParameters(
			req.body,
			res,
			[
				['phone', 'string'],
				['pinCode', 'string'],
				['campaignId', 'ObjectId'],
				['campaignPassword', 'string']
			],
			__filename
		)
	)
		return;

	if (!checkPinCode(req.body.pinCode, res, __filename)) return;

	const phone = clearPhone(req.body.phone);
	if (!phoneNumberCheck(phone)) {
		res.status(400).send({ message: 'Invalid phone number', OK: false });
		log(`[!${req.body.phone}, ${ip}] Invalid phone number`, 'WARNING', __filename);
		return;
	}

	const caller = await Caller.findOne({ phone: phone, pinCode: { $eq: req.body.pinCode } }, [
		'name',
		'campaigns',
		'phone',
		'areasJoined'
	]);
	if (!caller) {
		res.status(403).send({ message: 'Invalid credential or incorrect campaing', OK: false });
		log(`[!${req.body.phone}, ${ip}] Invalid credential or incorrect campaing`, 'WARNING', __filename);
		return;
	}

	const campaign = await Campaign.findOne(
		{
			_id: { $eq: req.body.campaignId },
			password: { $eq: req.body.campaignPassword }
		},
		'name'
	);
	if (!campaign) {
		res.status(404).send({ message: 'new campaign not found', OK: false });
		log(`[${req.body.phone}, ${ip}] new campaign not found from`, 'WARNING', __filename);
		return;
	}
	if (caller.campaigns.includes(campaign.id)) {
		res.status(403).send({ message: 'Already joined campaign', OK: false });
		log(`[${req.body.phone}, ${ip}] Already joined campaign`, 'WARNING', __filename);
		return;
	}

	try {
		caller.areasJoined.push(campaign.id);
		await caller.save();
	} catch (e) {
		res.status(500).send({ message: 'Internal error', OK: false });
		log(`[${req.body.phone}, ${ip}] Internal error: ${e}`, 'ERROR', __filename);
		return;
	}

	res.status(200).send({
		message: 'Campaign joined',
		data: {
			campaignId: campaign._id,
			campaignName: campaign.name
		},
		OK: true
	});
	log(`[${req.body.phone}, ${ip}] join campaign: ${campaign.name}`, 'INFO', __filename);
}
