import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';

import { Call } from '../../Models/Call';
import { Caller } from '../../Models/Caller';
import { Campaign } from '../../Models/Campaign';
import { log } from '../../tools/log';
import { checkParameters, clearPhone, phoneNumberCheck } from '../../tools/utils';

/**
 * get information of other caller
 *
 * @example
 * body:
 * {
 * 	"phone": string,
 * 	"pinCode": string  {max 4 number},
 * 	"otherPhone": string
 * }
 *
 * @throws {400}: Missing parameters
 * @throws {400}: Invalid phone number
 * @throws {403}: Invalid credential
 * @throws {404}: Caller not found
 * @throws {404}: No active campaign
 * @throws {500}: Internal server error
 * @throws {200}: OK
 */
export default async function OtherCallerInfo(req: Request<any>, res: Response<any>) {
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
				['otherPhone', 'string'],
				['area', 'ObjectId']
			],
			__filename
		)
	)
		return;

	const phone = clearPhone(req.body.phone);
	if (!phoneNumberCheck(phone)) {
		res.status(400).send({ message: 'Invalid phone number', OK: false });
		log(`[!${req.body.phone}, ${ip}] Invalid phone number`, 'WARNING', __filename);
		return;
	}

	const otherPhone = clearPhone(req.body.otherPhone);
	if (!phoneNumberCheck(otherPhone)) {
		res.status(400).send({ message: 'Invalid phone number', OK: false });
		log(`[!${req.body.phone}, ${ip}] Invalid phone number`, 'WARNING', __filename);
		return;
	}

	const caller = await Caller.findOne({ phone: phone, pinCode: { $eq: req.body.pinCode } }, ['_id', 'name']);
	if (!caller) {
		res.status(403).send({ message: 'Invalid credential', OK: false });
		log(`[!${req.body.phone}, ${ip}] Invalid credential`, 'WARNING', __filename);
		return;
	}

	const campaign = await Campaign.findOne({ area: { $eq: req.body.area }, active: true });
	if (!campaign) {
		res.status(404).send({ message: 'No active campaign', OK: false });
		log(`[${req.body.phone}, ${ip}] No active campaign`, 'WARNING', __filename);
		return;
	}

	const otherCaller = await Caller.findOne({ phone: otherPhone }, ['_id', 'name', 'phone']);
	if (!otherCaller) {
		res.status(404).send({ message: 'Caller not found', OK: false });
		log(`[${req.body.phone}, ${ip}] Caller not`, 'WARNING', __filename);
		return;
	}

	const timeCall = await Call.aggregate([
		{ $match: { caller: new ObjectId(otherCaller._id), campaign: new ObjectId(campaign._id) } },
		{
			$group: {
				_id: '$Caller',
				count: { $sum: 1 },
				totalDuration: { $sum: '$duration' }
			}
		},
		{
			$project: {
				count: 1,
				totalDuration: 1
			}
		}
	]);
	if (!timeCall || timeCall.length === 0) {
		timeCall.push({ count: 0, totalDuration: 0 });
	}
	res.status(200).send({
		message: 'OK',
		OK: true,
		data: { count: timeCall[0].count, duration: timeCall[0].totalDuration }
	});
	log(`[${req.body.phone}, ${ip}] get information of ${otherCaller.phone}`, 'INFO', __filename);
}
