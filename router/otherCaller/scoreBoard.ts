import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import mongoose from 'mongoose';

import { Call } from '../../Models/Call';
import { Caller } from '../../Models/Caller';
import { Campaign } from '../../Models/Campaign';
import { log } from '../../tools/log';
import { clearPhone, phoneNumberCheck } from '../../tools/utils';

/**
 * get the top 5 callers in a campaign and our score
 *
 * @example
 * body:
 * {
 * 	"phone": string,
 * 	"pinCode": string  {max 4 number},
 * 	"area": mongoDBID,
 * 	"campaignId": mongoDBID | null
 * }
 *
 * @throws {400}: Missing parameters
 * @throws {400}: Wrong phone number
 * @throws {404}: no campaing in progress
 * @throws {404}: Caller not found
 * @throws {200}: topfiveUsers
 */
export default async function scoreBoard(req: Request<any>, res: Response<any>) {
	const ip = req.socket?.remoteAddress?.split(':').pop();

	if (
		!req.body ||
		typeof req.body.phone != 'string' ||
		typeof req.body.pinCode != 'string' ||
		!ObjectId.isValid(req.body.area) ||
		(req.body.campaignId && !ObjectId.isValid(req.body.campaignId))
	) {
		res.status(400).send({ message: 'Missing parameters', OK: false });
		log(`Missing parameters from: ` + ip, 'WARNING', __filename);
		return;
	}

	if (!req.body.campaignId) {
		req.body.campaignId = (await Campaign.findOne({ area: { $eq: req.body.area }, active: true }, ['_id']))?._id;
		if (!req.body.campaignId) {
			res.status(404).send({ message: 'no campaing in progress', OK: false });
			log(`no campaing in progress from: ` + ip, 'WARNING', __filename);
			return;
		}
	}

	const phone = clearPhone(req.body.phone);
	if (!phoneNumberCheck(phone)) {
		res.status(400).send({ message: 'Wrong phone number', OK: false });
		log(`Wrong phone number from: ` + ip, 'WARNING', __filename);
		return;
	}
	const caller = await Caller.findOne({
		phone: phone,
		pinCode: { $eq: req.body.pinCode },
		area: { $eq: req.body.area },
		campaigns: { $eq: req.body.campaignId }
	});
	if (!caller) {
		res.status(404).send({ message: 'Caller not found', OK: false });
		log(`Caller not found from: ` + ip, 'WARNING', __filename);
		return;
	}
	const topfiveUsers = await Call.aggregate([
		{
			$match: {
				Campaign: mongoose.Types.ObjectId.createFromHexString(req.body.campaignId)
			}
		},
		{
			$group: {
				_id: '$Caller',
				count: { $sum: 1 },
				totalDuration: { $sum: '$duration' }
			}
		},
		{
			$sort: { count: -1 }
		},
		{
			$limit: 5
		},
		{
			$lookup: {
				from: 'callers',
				localField: '_id',
				foreignField: '_id',
				as: 'caller'
			}
		},
		{
			$project: {
				_id: 1,
				name: { $arrayElemAt: ['$caller.name', 0] },
				count: 1,
				totalDuration: 1
			}
		}
	]);
	if (!topfiveUsers.find(user => user._id.toString() == caller._id)) {
		const user = await Call.aggregate([
			{
				$match: {
					Campaign: mongoose.Types.ObjectId.createFromHexString(req.body.campaignId),
					Caller: caller._id
				}
			},
			{
				$group: {
					_id: '$Caller',
					count: { $sum: 1 },
					totalDuration: { $sum: '$duration' }
				}
			},
			{
				$lookup: {
					from: 'callers',
					localField: '_id',
					foreignField: '_id',
					as: 'caller'
				}
			},
			{
				$project: {
					_id: 1,
					name: { $arrayElemAt: ['$caller.name', 0] },
					count: 1,
					totalDuration: 1
				}
			}
		]);
		topfiveUsers.push(user[0]);
	}
	console.log(topfiveUsers);
	res.status(200).send({ topfiveUsers, OK: true });
	log(`Scoreboard sent to ${caller.name} (${ip})`, 'INFO', __filename);
}
