import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import mongoose from 'mongoose';

import { Area } from '../../Models/Area';
import { Caller } from '../../Models/Caller';
import { Campaign } from '../../Models/Campaign';
import { Client } from '../../Models/Client';
import checkCredentials from '../../tools/checkCredentials';
import getCurrentCampaign from '../../tools/getCurrentCampaign';
import { log } from '../../tools/log';

export default async function endCall(req: Request<any>, res: Response<any>) {
	const ip = req.socket?.remoteAddress?.split(':').pop();
	if (
		!req.body ||
		typeof req.body.phone != 'string' ||
		typeof req.body.pinCode != 'string' ||
		!ObjectId.isValid(req.body.area) ||
		typeof req.body.timeInCall != 'number' ||
		typeof req.body.satisfaction != 'number' ||
		(req.body.comment && typeof req.body.comment != 'string')
	) {
		res.status(400).send({ message: 'Missing parameters', OK: false });
		log(`Missing parameters`, 'WARNING', 'endCall.ts');
		return;
	}

	if (isNaN(req.body.timeInCall)) {
		res.status(400).send({ message: 'timeInCall is not a number', OK: false });
		log(`timeInCall is not a number from ` + ip, 'WARNING', 'endCall.ts');
		return;
	}

	req.body.timeInCall = Math.min(req.body.timeInCall, 1_200_000);

	if (isNaN(req.body.satisfaction) || ![-2, -1, 0, 1, 2].includes(req.body.satisfaction)) {
		res.status(400).send({ message: 'satisfaction is not a valid number', OK: false });
		log(`satisfaction is not a valid number from ` + ip, 'WARNING', 'endCall.ts');
		return;
	}

	const caller = await checkCredentials(req.body.phone, req.body.pinCode);
	if (!caller) {
		res.status(403).send({ message: 'Invalid credential', OK: false });
		log(`Invalid credential from ` + ip, 'WARNING', 'endCall.ts');
		return;
	}
	if (!caller.currentCall || !caller.currentCall.client) {
		res.status(400).send({ message: 'Not in a call', OK: false });
		log(`Not in a call from ${caller.name} (${ip})`, 'WARNING', 'endCall.ts');
		return;
	}

	const client = await Client.findOne({ _id: caller.currentCall.client.toString() });
	if (!client) {
		res.status(400).send({ message: 'Not in a call', OK: false });
		log(`Not in a call from ${caller.name} (${ip})`, 'WARNING', 'endCall.ts');
		return;
	}

	const curentCampaign = await getCurrentCampaign(req.body.area);
	if (!curentCampaign) {
		res.status(404).send({ message: 'no actual Camaing', OK: false });
		log(`no actual Camaing from ${caller.name} (${ip})`, 'WARNING', 'endCall.ts');
		return;
	}
	let nbCall = client.data.get(curentCampaign._id.toString())?.length;
	if (!nbCall) {
		const newData = new mongoose.Types.DocumentArray([{ status: 'not called' }]) as any;
		client.data.set(curentCampaign._id.toString(), newData);
		nbCall = 1;
	}

	if (req.body.satisfaction == -2) {
		await Campaign.updateOne({ _id: curentCampaign._id }, { $push: { trashUser: client._id } });
		log(`delete ${client.phone} client from ${caller.name} (${ip})`, 'INFORMATION', 'endCall.ts');
	}
	const clientCampaign = client.data.get(curentCampaign._id.toString()) as Array<any>;
	if (!clientCampaign) {
		res.status(500).send({ message: 'Internal error', OK: false });
		log(`Internal error from ${caller.name} (${ip})`, 'ERROR', 'endCall.ts');
		return;
	}
	if (clientCampaign.length > 0) {
		//pop fisrt case for remplace this by case up to date
		clientCampaign.pop();
	}
	clientCampaign.push({
		status: req.body.satisfaction == 0 ? 'not answered' : 'called',
		caller: caller._id,
		scriptVersion: clientCampaign.length - 1,
		startCall: new Date(new Date().getTime() - req.body.timeInCall ?? 0),
		endCall: new Date(),
		satisfaction: req.body.satisfaction,
		comment: req.body.comment && req.body.comment.trim().length > 0 ? req.body.comment.trim() : ''
	});

	await Caller.updateOne(
		{ _id: caller._id },
		{
			$push: {
				timeInCall: {
					date: new Date(),
					client: client._id,
					time: req.body.timeInCall ?? 0,
					campaign: curentCampaign._id
				}
			},
			currentCall: null
		}
	);

	await client.save();
	res.status(200).send({ message: 'OK', OK: true });
	log(`end call from ${caller.name} (${ip})`, 'INFORMATION', 'endCall.ts');
}
