import { Request, Response } from 'express';
import mongoose from 'mongoose';

import { Area } from '../../Models/Area';
import { Call } from '../../Models/Call';
import { Caller } from '../../Models/Caller';
import { Campaign } from '../../Models/Campaign';
import { Client } from '../../Models/Client';
import { log } from '../../tools/log';
import { checkParameters, checkPinCode, clearPhone, phoneNumberCheck } from '../../tools/utils';

/**
 * Get a phone number to call
 * @example
 * body:{
 * 	"phone": string,
 * 	"pinCode": string  {max 4 number},
 * 	"area":mongoDBID
 * }
 *
 * @throws {400}: Missing parameters
 * @throws {400}: Invalid pin code
 * @throws {400}: Invalid phone number
 * @throws {403}: Invalid credential
 * @throws {403}: Call not permited
 * @throws {403}: Campaign not active
 * @throws {404}: Campaign not found
 * @throws {404}: No client to call
 * @throws {500}: Internal error
 * @throws {200}: Client to call
 */
export default async function getPhoneNumber(req: Request<any>, res: Response<any>) {
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
				['area', 'ObjectId'],
				['campaign', 'ObjectId', true]
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

	const area = await Area.findOne({ _id: { $eq: req.body.area } });
	if (!area) {
		res.status(404).send({ message: 'Area not found', OK: false });
		log(`[!${req.body.phone}, ${ip}] Area not found from (${ip})`, 'WARNING', __filename);
		return;
	}

	let campaign: InstanceType<typeof Campaign> | null = null;
	if (req.body.CampaignId) {
		campaign = await Campaign.findOne(
			{
				_id: { $eq: req.body.CampaignId },
				area: area._id,
				password: { $eq: req.body.campaignPassword }
			},
			['script', 'callPermited', 'timeBetweenCall', 'nbMaxCallCampaign', 'active', 'status']
		);
	} else {
		campaign = await Campaign.findOne(
			{
				area: area._id,
				active: true
			},
			['script', 'callPermited', 'timeBetweenCall', 'nbMaxCallCampaign', 'active', 'status']
		);
	}

	if (!campaign || !campaign.active) {
		res.status(404).send({ message: 'Campaign not found or not active', OK: false });
		log(`[!${req.body.phone}, ${ip}] Campaign not found or not active`, 'WARNING', __filename);
		return;
	}
	const caller = await Caller.findOne(
		{
			phone: phone,
			pinCode: { $eq: req.body.pinCode },
			$or: [
				{
					campaigns: campaign.id
				},
				{
					area: { $eq: req.body.area }
				}
			]
		},
		['name']
	);
	if (!caller) {
		res.status(403).send({ message: 'Invalid credential or incorrect campaing', OK: false });
		log(`[!${req.body.phone}, ${ip}] Invalid credential or incorrect campaing`, 'WARNING', __filename);
		return;
	}

	if (!campaign.callPermited) {
		res.status(403).send({ message: 'Call not permited', OK: false });
		log(`[${req.body.phone}, ${ip}] Call not permited`, 'WARNING', __filename);
		return;
	}

	const call = await Call.findOne(
		{ caller: { $eq: caller._id }, satisfaction: 'In progress', campaign: { $eq: campaign.id } },
		['client', 'campaign']
	);
	if (call) {
		call.lastInteraction = new Date();
		try {
			await call.save();
		} catch (e) {
			res.status(500).send({ message: 'Internal error', OK: false });
			log(`[${req.body.phone}, ${ip}] Error while updating call ${caller.name} (${ip})`, 'ERROR', __filename);
			return;
		}
		res.status(200).send({
			message: 'Client to call',
			OK: true,
			client: await Client.findOne({ _id: { $eq: call.client } }, ['name', 'firstname', 'institution', 'phone']),
			callHistory: await Call.find(
				{
					client: { $eq: call.client },
					campaign: { $eq: campaign.id },
					satisfaction: { $ne: 'In progress' }
				},
				['status', 'satisfaction', 'duration', 'comment', 'start']
			),
			script: campaign.script,
			status: campaign.status
		});
		log(`[${req.body.phone}, ${ip}] Already in a call`, 'INFO', __filename);
		return;
	}

	let client: mongoose.Document[] | null = null;
	try {
		client = await Client.aggregate([
			{
				$lookup: {
					from: 'calls',
					localField: '_id',
					foreignField: 'client',
					as: 'calls'
				}
			},
			{
				$addFields: {
					nbCalls: { $size: '$calls' },
					lastCall: {
						$ifNull: [
							{
								$arrayElemAt: [
									{
										$filter: {
											input: '$calls',
											as: 'call',
											cond: { $eq: ['$$call.campaign', campaign._id] }
										}
									},
									-1
								]
							},
							null
						]
					},
					lastStatus: {
						$ifNull: [
							{
								$arrayElemAt: [
									{
										$filter: {
											input: '$calls',
											as: 'call',
											cond: { $eq: ['$$call.campaign', campaign._id] }
										}
									},
									-1
								]
							},
							null
						]
					}
				}
			},
			{
				$match: {
					$and: [
						{ campaigns: { $in: [campaign._id] } }, // only client from the campaign
						{ delete: { $ne: true } } // client not deleted
					]
				}
			},
			{
				$addFields: {
					nbCalls: { $size: '$calls' },
					lastCall: {
						$ifNull: [
							{
								$arrayElemAt: [
									{
										$filter: {
											input: '$calls',
											as: 'call',
											cond: { $eq: ['$$call.campaign', campaign._id] }
										}
									},
									-1
								]
							},
							null
						]
					},
					lastStatus: {
						$ifNull: [
							{
								$arrayElemAt: [
									{
										$filter: {
											input: '$calls',
											as: 'call',
											cond: { $eq: ['$$call.campaign', campaign._id] }
										}
									},
									-1
								]
							},
							null
						]
					},
					lastSatisfaction: {
						$ifNull: [
							{
								$arrayElemAt: [
									{
										$filter: {
											input: '$calls',
											as: 'call',
											cond: { $eq: ['$$call.campaign', campaign._id] }
										}
									},
									-1
								]
							},
							null
						]
					}
				}
			},
			{
				$match: {
					$and: [
						{ lastSatisfaction: { $ne: 'In progress' } }, // client not in call
						{ $or: [{ lastStatus: true }, { nbCalls: 0 }] }, // keep only client with status true or not called
						{ nbCalls: { $lt: campaign.nbMaxCallCampaign } }, // client not called too much
						{
							$or: [
								{ lastCall: { $lte: new Date(Date.now() - campaign.timeBetweenCall) } }, // client not called too recently
								{ lastCall: null } // handle clients who have never been called
							]
						}
					]
				}
			},
			{
				$project: {
					_id: 1,
					name: 1,
					firstname: 1,
					institution: 1,
					phone: 1
				}
			}
		]);
	} catch (e) {
		res.status(500).send({ message: 'Internal error', OK: false });
		log(`[${req.body.phone}, ${ip}] Error while getting client`, 'ERROR', __filename);
	}
	if (!client || client.length == 0) {
		res.status(404).send({ message: 'No client to call', OK: false });
		log(`[${req.body.phone}, ${ip}] No client to call`, 'WARNING', __filename);
		return;
	}

	const callClient = new Call({
		client: client[0]._id,
		caller: caller._id,
		campaign: campaign._id,
		satisfaction: 'In progress',
		start: new Date()
	});

	try {
		await callClient.save();
	} catch (e) {
		res.status(500).send({ message: 'Internal error', OK: false });
		log(`[${req.body.phone}, ${ip}] Error while saving call`, 'ERROR', __filename);
		return;
	}

	const lastsCall = await Call.find(
		{
			client: { $eq: client[0]._id },
			campaign: { $eq: campaign.id },
			satisfaction: { $ne: 'In progress' }
		},
		['status', 'satisfaction', 'duration', 'comment', 'start']
	);
	res.status(200).send({
		message: 'Client to call',
		OK: true,
		client: client[0],
		callHistory: lastsCall ?? [],
		script: campaign.script,
		status: campaign.status
	});
	log(`[${req.body.phone}, ${ip}] Client to call`, 'INFO', __filename);
}
