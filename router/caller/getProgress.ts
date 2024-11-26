import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';

import { Call } from '../../Models/Call';
import { Caller } from '../../Models/Caller';
import { Campaign } from '../../Models/Campaign';
import { Client } from '../../Models/Client';
import { log } from '../../tools/log';
import { checkParameters, checkPinCode, clearPhone, phoneNumberCheck } from '../../tools/utils';

/**
 * Get the progress of a caller
 * @example
 * body:
 * {
 * 	"phone": "string",
 * 	"pinCode": string  {max 4 number},
 * 	"area":mongoDBID
 * }
 *
 * @throws {400}: Missing parameters
 * @throws {400}: Invalid phone number
 * @throws {403}: Invalid credential or incorrect campaing
 * @throws {200}: OK
 */
export default async function getProgress(req: Request<any>, res: Response<any>) {
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
				['campaign', 'ObjectId', true],
				['area', 'ObjectId']
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

	const caller = await Caller.findOne(
		{ phone: phone, pinCode: { $eq: req.body.pinCode }, area: { $eq: req.body.area } },
		['name', 'campaigns', 'phone', 'area']
	);

	if (!caller) {
		res.status(403).send({ message: 'Invalid credential or incorrect area', OK: false });
		log(`Invalid credential or incorrect area from: ${phone} (${ip})`, 'WARNING', __filename);
		return;
	}
	let campaign: InstanceType<typeof Campaign> | null;
	if (req.body.campaign) {
		campaign = await Campaign.findOne({ _id: { $eq: req.body.campaign } }, ['_id', 'area']);
	} else {
		campaign = await Campaign.findOne({ area: { $eq: req.body.area }, active: true }, ['_id', 'area']);
	}
	if (!campaign) {
		res.status(404).send({ message: 'Campaign not found or not active', OK: false });
		log(`Campaign not found or not active from: ${phone} (${ip})`, 'WARNING', __filename);
		return;
	}
	if (!caller.campaigns.includes(campaign._id) && !(campaign.area.toString() == caller.area.toString())) {
		res.status(403).send({ message: 'Invalid campaigns', OK: false });
		log(`Invalid campaigns from: ${phone} (${ip})`, 'WARNING', __filename);
		return;
	}

	const totalClientCalled = await Call.countDocuments({ campaign: campaign._id, caller: caller._id });
	const totaldiscution = await Call.countDocuments({ campaign: campaign._id, caller: caller._id });
	const totalCall = await Call.countDocuments({
		campaign: campaign._id
	});
	const totalUser = await Client.countDocuments({
		campaigns: campaign._id
	});
	const totalConvertion = await Call.countDocuments({
		campaign: campaign._id,
		status: true,
		satisfaction: 2
	});

	const totalCallTime = await Call.aggregate([
		{
			$match: {
				campaign: campaign._id,
				caller: caller._id
			}
		},
		{ $group: { _id: null, totalDuration: { $sum: '$duration' } } }
	]);

	res.status(200).send({
		message: 'OK',
		OK: true,
		data: {
			totalClientCalled: totalClientCalled,
			totalDiscution: totaldiscution,
			totalCall: totalCall,

			totalUser: totalUser,
			totalConvertion: totalConvertion,
			totalCallTime: totalCallTime[0]?.totalDuration ?? 0
		}
	});
	log(`Caller ${caller.name} (${caller.phone}) requested his progress`, 'INFO', __filename);
}
