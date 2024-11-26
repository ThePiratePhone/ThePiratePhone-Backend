import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';

import { Area } from '../../../Models/Area';
import { Call } from '../../../Models/Call';
import { Caller } from '../../../Models/Caller';
import { Campaign } from '../../../Models/Campaign';
import { log } from '../../../tools/log';
import { checkParameters, clearPhone, hashPasword, phoneNumberCheck } from '../../../tools/utils';

/**
 * get information of caller
 *
 * @example
 * body:
 * {
 * 	"phone": string,
 * 	"adminCode": string,
 * 	"area": string,
 * 	"CampaignId": string
 * }
 *
 * @throws {400}: Missing parameters
 * @throws {400}: Wrong phone number
 * @throws {404}: no area found
 * @throws {404}: no caller found
 * @throws {404}: no campaign active
 * @throws {404}: No data found
 * @throws {200}: OK
 */
export default async function callerInfo(req: Request<any>, res: Response<any>) {
	const ip = Array.isArray(req.headers['x-forwarded-for'])
		? req.headers['x-forwarded-for'][0]
		: req.headers['x-forwarded-for']?.split(',')?.[0] ?? req.ip;
	if (
		!checkParameters(
			req.body,
			res,
			[
				['adminCode', 'string'],
				['phone', 'string'],
				['area', 'string'],
				['CampaignId', 'ObjectId', true],
				['allreadyHaseded', 'boolean', true]
			],
			__filename
		)
	)
		return;

	const phone = clearPhone(req.body.phone);
	if (!phoneNumberCheck(phone)) {
		res.status(400).send({ message: 'Wrong phone number', OK: false });
		log(`Wrong phone number from ${ip}`, 'WARNING', __filename);
		return;
	}

	const password = hashPasword(req.body.adminCode, req.body.allreadyHaseded, res);
	if (!password) return;
	const area = await Area.findOne({ _id: { $eq: req.body.area }, adminPassword: { $eq: password } }, ['_id', 'name']);
	if (!area) {
		res.status(404).send({ message: 'no area found', OK: false });
		log(`no area found from ${ip}`, 'WARNING', __filename);
		return;
	}

	const caller = await Caller.findOne({ phone: { $eq: phone }, area: { $eq: req.body.area } }, [
		'_id',
		'name',
		'phone'
	]);
	if (!caller) {
		res.status(404).send({ message: 'no caller found', OK: false });
		log(`no caller found from ${area.name} ${ip}`, 'WARNING', __filename);
		return;
	}

	if (!req.body.CampaignId) {
		req.body.CampaignId = (await Campaign.findOne({ area: area.id, active: true }, ['_id']))?.id;
	}
	if (!req.body.CampaignId) {
		res.status(404).send({ message: 'no campaign active', OK: false });
		log(`no actual campaign from ${area.name} ${ip}`, 'WARNING', __filename);
		return;
	}

	const data: Array<{ totalCount: number; totalDuration: number; campaignDuration: number; campaignCount: number }> =
		await Call.aggregate([
			{
				$facet: {
					callerTotalData: [
						{ $match: { Caller: new ObjectId(caller._id) } },
						{
							$group: {
								_id: '$Caller',
								totalCount: { $sum: 1 },
								totalDuration: { $sum: '$duration' }
							}
						},
						{
							$project: {
								_id: 0,
								totalCount: 1,
								totalDuration: 1
							}
						}
					],
					campaignData: [
						{
							$match: {
								caller: new ObjectId(caller._id),
								campaign: ObjectId.createFromHexString(req.body.CampaignId)
							}
						},
						{
							$group: {
								_id: '$caller',
								campaignCount: { $sum: 1 },
								campaignDuration: { $sum: '$duration' }
							}
						},
						{
							$project: {
								_id: 0,
								campaignCount: 1,
								campaignDuration: 1
							}
						}
					]
				}
			},
			{
				$project: {
					TotalCount: { $arrayElemAt: ['$callerTotalData.totalCount', 0] },
					TotalDuration: { $arrayElemAt: ['$callerTotalData.totalDuration', 0] },
					campaignCount: { $arrayElemAt: ['$campaignData.campaignCount', 0] },
					campaignDuration: { $arrayElemAt: ['$campaignData.campaignDuration', 0] }
				}
			}
		]);

	if (!data || data.length == 0) {
		res.status(404).send({ message: 'No data found', OK: false });
		log(`No data found from ${area.name} ${ip}`, 'WARNING', __filename);
		return;
	}
	res.status(200).send({
		message: 'OK',
		OK: true,
		data: {
			id: caller._id,
			name: caller.name,
			phone: caller.phone,
			totalTimeCampaign: data[0].campaignDuration,
			nbCallsCampaign: data[0].campaignCount,
			totalTime: data[0].totalDuration,
			nbCalls: data[0].totalCount
		}
	});

	log(`Caller info get from ${area.name} ${ip}`, 'INFO', __filename);
}
