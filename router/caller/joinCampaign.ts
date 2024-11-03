import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';

import { Caller } from '../../Models/Caller';
import { Campaign } from '../../Models/Campaign';
import { log } from '../../tools/log';
import { checkParameters, checkPinCode, clearPhone, phoneNumberCheck } from '../../tools/utils';
import { Area } from '../../Models/Area';

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
	const ip = req.hostname;
	if (
		!checkParameters(
			req.body,
			res,
			[
				['phone', 'string'],
				['pinCode', 'string'],
				['destinationArea', 'ObjectId'],
				['campaignId', 'ObjectId', true],
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
		log(`Invalid phone number from: ${ip}`, 'WARNING', __filename);
		return;
	}

	const caller = await Caller.findOne({ phone: phone, pinCode: { $eq: req.body.pinCode } }, [
		'name',
		'campaigns',
		'phone'
	]);
	if (!caller) {
		res.status(403).send({ message: 'Invalid credential or incorrect campaing', OK: false });
		log(`Invalid credential or incorrect campaing from: ${phone} (${ip})`, 'WARNING', __filename);
		return;
	}

	const area = await Area.findOne({ _id: { $eq: req.body.destinationArea } });
	if (!area) {
		res.status(404).send({ message: 'Area not found', OK: false });
		log(`Area not found from ${caller.name} (${ip})`, 'WARNING', __filename);
		return;
	}

	let campaign: InstanceType<typeof Campaign> | null = null;
	if (req.body.CampaignId) {
		campaign = await Campaign.findOne({
			_id: { $eq: req.body.CampaignId },
			area: area._id,
			password: { $eq: req.body.campaignPassword }
		});
	} else {
		campaign = await Campaign.findOne({
			area: area._id,
			active: true,
			password: { $eq: req.body.campaignPassword }
		});
	}
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
