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
 * @throws {500}: No data found
 * @throws {200}: topfiveUsers
 */

export default async function scoreBoard(req: Request<any>, res: Response<any>) {
	const ip =
		(Array.isArray(req.headers['x-forwarded-for'])
			? req.headers['x-forwarded-for'][0]
			: req.headers['x-forwarded-for']?.split(',')?.[0] ?? req.ip) ?? 'no IP';
	if (
		!req.body ||
		typeof req.body.phone != 'string' ||
		typeof req.body.pinCode != 'string' ||
		!ObjectId.isValid(req.body.area) ||
		(req.body.campaignId && !ObjectId.isValid(req.body.campaignId))
	) {
		res.status(400).send({ message: 'Missing parameters', OK: false });
		log(`[!${req.body.phone}, ${ip}] Missing parameters`, 'WARNING', __filename);
		return;
	}

	if (!req.body.campaignId || !ObjectId.isValid(req.body.campaignId)) {
		req.body.campaignId = (
			await Campaign.findOne({ area: { $eq: req.body.area }, active: true }, ['_id'])
		)?._id.toString();
		if (!req.body.campaignId || !ObjectId.isValid(req.body.campaignId)) {
			res.status(404).send({ message: 'no campaing in progress', OK: false });
			log(`[!${req.body.phone}, ${ip}] no campaing in progress`, 'WARNING', __filename);
			return;
		}
	}

	const phone = clearPhone(req.body.phone);
	if (!phoneNumberCheck(phone)) {
		res.status(400).send({ message: 'Wrong phone number', OK: false });
		log(`[!${req.body.phone}, ${ip}] Wrong phone number`, 'WARNING', __filename);
		return;
	}
	const caller = await Caller.findOne({
		phone: phone,
		pinCode: { $eq: req.body.pinCode },
		$or: [
			{
				campaigns: req.body.campaignId
			},
			{
				area: { $eq: req.body.area }
			}
		]
	});
	if (!caller) {
		res.status(404).send({ message: 'Caller not found', OK: false });
		log(`[!${req.body.phone}, ${ip}] Caller not found`, 'WARNING', __filename);
		return;
	}
	const topfiveUsers: Array<{
		you: boolean | null;
		_id: mongoose.Types.ObjectId;
		name: string;
		count: number;
		totalDuration: number;
	}> = await Call.aggregate([
		{
			$match: {
				campaign: mongoose.Types.ObjectId.createFromHexString(req.body.campaignId)
			}
		},
		{
			$group: {
				_id: '$caller',
				count: { $sum: 1 },
				totalDuration: { $sum: '$duration' }
			}
		},
		{
			$match: {
				count: { $gt: 0 }
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
	let yourPlace = topfiveUsers.findIndex(user => user._id.toString() == caller._id.toString());
	if (!topfiveUsers.find(user => user._id.toString() == caller._id.toString())) {
		const user = (
			await Call.aggregate([
				{
					$match: {
						campaign: new ObjectId('66fa8fa1d7d61195b453507d')
					}
				},
				{
					$group: {
						_id: '$caller',
						count: { $sum: 1 },
						totalDuration: { $sum: '$duration' }
					}
				},
				{
					$match: {
						count: { $gt: 0 }
					}
				},
				{
					$sort: { count: -1 }
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
						caller: {
							id: { $arrayElemAt: ['$caller._id', 0] }
						},
						count: 1,
						totalDuration: 1
					}
				},
				{
					$setWindowFields: {
						sortBy: { count: -1 },
						output: {
							rank: { $rank: {} }
						}
					}
				},
				{
					$match: {
						'caller.id': new ObjectId('675832042d65b7802dc468c8')
					}
				}
			])
		)[0];

		if (user) {
			topfiveUsers.push(user);
			yourPlace = user.rank - 1;
		} else {
			topfiveUsers.push({
				you: true,
				_id: caller._id,
				name: caller.name,
				count: 0,
				totalDuration: 0
			});
			yourPlace = (await Caller.countDocuments()) - 1;
		}
	}
	yourPlace++;
	if (!topfiveUsers) {
		res.status(500).send({ message: 'No data found', OK: false });
		log(`[${req.body.phone}, ${ip}] No data found`, 'WARNING', __filename);
		return;
	}
	topfiveUsers.forEach(user => {
		user.you = user._id.toString() == caller._id.toString();
	});
	res.status(200).send({ topfiveUsers, yourPlace, OK: true });
	log(`[${req.body.phone}, ${ip}] Scoreboard sent`, 'INFO', __filename);
}
