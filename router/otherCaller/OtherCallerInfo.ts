import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';

import { Call } from '../../Models/Call';
import { Caller } from '../../Models/Caller';
import { Campaign } from '../../Models/Campaign';
import { log } from '../../tools/log';
import { clearPhone, phoneNumberCheck } from '../../tools/utils';

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
	const ip = req.hostname;

	if (
		!req.body ||
		typeof req.body.phone != 'string' ||
		typeof req.body.pinCode != 'string' ||
		typeof req.body.otherPhone != 'string' ||
		!ObjectId.isValid(req.body.area)
	) {
		res.status(400).send({ message: 'Missing parameters', OK: false });
		log(`Missing parameters from: ` + ip, 'WARNING', __filename);
		return;
	}

	const phone = clearPhone(req.body.phone);
	if (!phoneNumberCheck(phone)) {
		res.status(400).send({ message: 'Invalid phone number', OK: false });
		log(`Invalid phone number from ${ip}`, 'WARNING', __filename);
		return;
	}

	const otherPhone = clearPhone(req.body.otherPhone);
	if (!phoneNumberCheck(otherPhone)) {
		res.status(400).send({ message: 'Invalid phone number', OK: false });
		log(`Invalid phone number from ${ip}`, 'WARNING', __filename);
		return;
	}

	const caller = await Caller.findOne({ phone: phone, pinCode: { $eq: req.body.pinCode } }, ['_id', 'name']);
	if (!caller) {
		res.status(403).send({ message: 'Invalid credential', OK: false });
		log(`Invalid credential from: ${phone} (${ip})`, 'WARNING', __filename);
		return;
	}

	const campaign = await Campaign.findOne({ area: { $eq: req.body.area }, active: true });
	if (!campaign) {
		res.status(404).send({ message: 'No active campaign', OK: false });
		log(`No active campaign from: ${phone} (${ip})`, 'WARNING', __filename);
		return;
	}

	const otherCaller = await Caller.findOne({ phone: otherPhone }, ['_id', 'name', 'phone']);
	if (!otherCaller) {
		res.status(404).send({ message: 'Caller not found', OK: false });
		log(`Caller not found: ${otherPhone} (${ip})`, 'WARNING', __filename);
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
		res.status(500).send({ message: 'Internal server error', OK: false });
		log(
			`Internal server error: ${otherCaller.phone} (${otherCaller.name}) from: ${phone} (${ip})`,
			'ERROR',
			__filename
		);
	}
	res.status(200).send({
		message: 'OK',
		OK: true,
		data: { count: timeCall[0].count, duration: timeCall[0].totalDuration }
	});
	log(`get information of ${otherCaller.phone} (${otherCaller.name}) from: ${phone} (${ip})`, 'INFO', __filename);
}
