import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';

import { log } from '../../tools/log';
import { clearPhone, phoneNumberCheck } from '../../tools/utils';
import { Caller } from '../../Models/Caller';
import { Client } from '../../Models/Client';
import { Call } from '../../Models/Call';
import mongoose from 'mongoose';

/**
 * Get the progress of a caller
 * @example
 * body:
 * {
 * 	"phone": "string",
 * 	"pinCode": string  {max 4 number},
 * 	"campaignId": "mongoDBID",
 *  "area":mongoDBID
 * }
 *
 * @throws {400}: Missing parameters
 * @throws {400}: Invalid phone number
 * @throws {403}: Invalid credential or incorrect campaing
 * @throws {200}: OK
 */
export default async function getProgress(req: Request<any>, res: Response<any>) {
	const ip = req.socket?.remoteAddress?.split(':').pop();
	if (
		!req.body ||
		typeof req.body.phone != 'string' ||
		typeof req.body.pinCode != 'string' ||
		!ObjectId.isValid(req.body.campaignId) ||
		!ObjectId.isValid(req.body.area)
	) {
		res.status(400).send({ message: 'Missing parameters', OK: false });
		log(`Missing parameters from: ` + ip, 'WARNING', 'getProgress.ts');
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

	const totalClientCalled = await Call.countDocuments({ Campaign: { $eq: req.body.campaignId }, Caller: caller._id });
	const totaldiscution = await Call.countDocuments({ Campaign: { $eq: req.body.campaignId }, Caller: caller._id });
	const totalCall = await Call.countDocuments({
		Campaign: { $eq: req.body.campaignId },
		area: { $eq: req.body.area }
	});
	const totalUser = await Client.countDocuments({
		campaigns: { $eq: req.body.campaignId },
		area: { $eq: req.body.area }
	});
	const totalConvertion = await Call.countDocuments({
		campaign: { $eq: req.body.campaignId },
		$or: [{ status: 'Done' }, { status: 'deleted' }],
		satisfaction: 2
	});

	const totalCallTime = await Call.aggregate([
		{
			$match: {
				Campaign: { $eq: mongoose.Types.ObjectId.createFromHexString(req.body.campaignId) },
				Caller: caller._id
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
	log(`Caller ${caller.name} (${caller.phone}) requested his progress`, 'INFORMATION', __filename);
}
