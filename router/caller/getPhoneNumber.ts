import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import mongoose from 'mongoose';

import { Call } from '../../Models/Call';
import { Caller } from '../../Models/Caller';
import { Campaign } from '../../Models/Campaign';
import { Client } from '../../Models/Client';
import { log } from '../../tools/log';
import { clearPhone, phoneNumberCheck } from '../../tools/utils';

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
	const ip = req.socket?.remoteAddress?.split(':').pop();
	if (typeof req.body.phone != 'string' || typeof req.body.pinCode != 'string' || !ObjectId.isValid(req.body.area)) {
		res.status(400).send({ message: 'Missing parameters', OK: false });
		log(`Missing parameters from: ` + ip, 'WARNING', __filename);
		return;
	}

	if (req.body.pinCode.length != 4) {
		res.status(400).send({ message: 'Invalid pin code', OK: false });
		log(`Invalid pin code from: ` + ip, 'WARNING', __filename);
		return;
	}

	const phone = clearPhone(req.body.phone);
	if (!phoneNumberCheck(phone)) {
		res.status(400).send({ message: 'Invalid phone number', OK: false });
		log(`Invalid phone number from ${ip}`, 'WARNING', __filename);
		return;
	}

	const campaign = await Campaign.findOne({ active: true, area: { $eq: req.body.area } }, [
		'script',
		'callPermited',
		'timeBetweenCall',
		'nbMaxCallCampaign',
		'trashUser',
		'active'
	]);
	if (!campaign) {
		res.status(404).send({ message: 'Campaign not found', OK: false });
		log(`Campaign not found or not active from: ${phone} (${ip})`, 'WARNING', __filename);
		return;
	}
	console.log(phone, req.body.pinCode, req.body.area, campaign.id);
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
		log(`Invalid credential or incorrect campaing from: ${phone} (${ip})`, 'WARNING', __filename);
		return;
	}

	if (!campaign.callPermited) {
		res.status(403).send({ message: 'Call not permited', OK: false });
		log(`Call not permited from: ${caller.name} (${ip})`, 'WARNING', __filename);
		return;
	}

	const call = await Call.findOne({ caller: { $eq: caller._id }, status: 'In progress', campaign: campaign.id }, [
		'Client',
		'Campaign'
	]);
	if (call) {
		call.lastInteraction = new Date();
		try {
			await call.save();
		} catch (e) {
			res.status(500).send({ message: 'Internal error', OK: false });
			log(`Error while updating call ${caller.name} (${ip})`, 'ERROR', __filename);
			return;
		}
		res.status(200).send({
			message: 'Already in a call',
			OK: true,
			client: await Client.findById(call.client),
			callHistory: await Call.find({
				client: call.client,
				campaign: call.campaign,
				limit: campaign.nbMaxCallCampaign,
				sort: { start: -1 }
			}),
			script: campaign.script
		});
		log(`Already in a call from: ${caller.name} (${ip})`, 'INFO', __filename);
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
					lastCall: { $ifNull: [{ $arrayElemAt: ['$calls.start', -1] }, null] },
					lastStatus: { $ifNull: [{ $arrayElemAt: ['$calls.status', -1] }, null] }
				}
			},
			{
				$match: {
					$and: [
						{ trashUser: { $ne: caller._id } }, // not a trash
						{ $or: [{ lastStatus: 'to recall' }, { calls: { $size: 0 } }] }, // keep only client with status to recall or not called
						{ campaigns: campaign._id } // only client from the campaign
					]
				}
			},
			{
				$match: {
					$and: [
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
				$limit: 1
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
		log(`Error while getting client from: ${caller.name} (${ip})`, 'ERROR', __filename);
	}
	if (!client || client.length == 0) {
		res.status(404).send({ message: 'No client to call', OK: false });
		log(`No client to call from: ${caller.name} (${ip})`, 'WARNING', __filename);
		return;
	}

	const callClient = new Call({
		client: client[0]._id,
		caller: caller._id,
		campaign: campaign._id,
		status: 'In progress'
	});

	try {
		await callClient.save();
	} catch (e) {
		res.status(500).send({ message: 'Internal error', OK: false });
		log(`Error while saving call from: ${caller.name} (${ip})`, 'ERROR', __filename);
		return;
	}

	res.status(200).send({
		message: 'Client to call',
		OK: true,
		client: client[0],
		callHistory: await Call.find({
			client: client[0]._id,
			campaign: campaign._id,
			limit: campaign.nbMaxCallCampaign,
			sort: { start: -1 }
		}),
		script: campaign.script
	});
	log(`Client to call from: ${caller.name} (${ip})`, 'INFO', __filename);
}
