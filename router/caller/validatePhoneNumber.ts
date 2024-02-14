import { Request, Response } from 'express';

import { ObjectId } from 'mongodb';
import checkCredentials from '../../tools/checkCredentials';
import { log } from '../../tools/log';
import getCurentCampaign from '../../tools/getCurentCampaign';
import { Client } from '../../Models/Client';
import mongoose from 'mongoose';
import { Campaign } from '../../Models/Campaign';

export default async function validatePhoneNumber(req: Request<any>, res: Response<any>) {
	const ip = req.socket?.remoteAddress?.split(':').pop();

	if (
		!req.body ||
		typeof req.body.phone != 'string' ||
		typeof req.body.pinCode != 'string' ||
		!ObjectId.isValid(req.body.area) ||
		typeof req.body.phoneNumber != 'string' ||
		typeof req.body.satisfaction != 'number' ||
		(req.body.comment && typeof req.body.comment != 'string')
	) {
		res.status(400).send({ message: 'Missing parameters', OK: false });
		log(`Missing parameters from: ` + ip, 'WARNING', 'validatePhoneNumber.ts');
		return;
	}

	if (isNaN(req.body.satisfaction) || req.body.satisfaction < -2 || req.body.satisfaction > 2) {
		res.status(400).send({ message: 'satisfaction is not a valid number', OK: false });
		log(`satisfaction is not a valid number from ` + ip, 'ERROR', 'endCall.ts');
		return;
	}

	const caller = await checkCredentials(req.body.phone, req.body.pinCode);
	if (!caller) {
		res.status(403).send({ message: 'Wrong credentials', OK: false });
		log(`Wrong credentials from: ` + ip, 'WARNING', 'validatePhoneNumber.ts');
		return;
	}

	const curentCampaign: any = await getCurentCampaign(req.body.area);
	if (!curentCampaign) {
		res.status(404).send({ message: 'no actual Camaing', OK: false });
		log(`no actual Camaing from ${caller.name} (${ip})`, 'ERROR', 'validatePhoneNumber.ts');
		return;
	}

	if (curentCampaign.area.toString() != caller.area.toString() && !curentCampaign.callerList.includes(caller._id)) {
		res.status(403).send({ message: 'Caller not in campaign', OK: false });
		log(`Caller not in campaign from: ${caller.name} (${ip})`, 'WARNING', 'validatePhoneNumber.ts');
		return;
	}

	if (req.body.phoneNumber.startsWith('0')) {
		req.body.phoneNumber = req.body.phoneNumber.replace('0', '+33');
	}
	const client = await Client.findOne({
		phone: req.body.phoneNumber
	});
	if (!client) {
		res.status(404).send({ message: 'Client not found', OK: false });
		log(`Client not found from: ${caller.name} (${ip})`, 'WARNING', 'validatePhoneNumber.ts');
		return;
	}

	let nbCall = client.data.get(curentCampaign._id.toString())?.length;
	if (!nbCall) {
		const newData = new mongoose.Types.DocumentArray([{ status: 'not called' }]) as any;
		client.data.set(curentCampaign._id.toString(), newData);
		nbCall = 1;
	}

	if (req.body.satisfaction != -2) {
		const clientCampaign = (client.data.get(curentCampaign._id.toString()) as unknown as Map<string, any>)[
			nbCall - 1
		];
		if (!clientCampaign) {
			res.status(500).send({ message: 'Internal error', OK: false });
			log(`Internal error from ${caller.name} (${ip})`, 'ERROR', 'endCall.ts');
			return;
		}
		if (!clientCampaign) {
			res.status(500).send({ message: 'Internal error', OK: false });
			log(`Internal error from ${caller.name} (${ip})`, 'ERROR', 'endCall.ts');
			return;
		}
		clientCampaign.status = req.body.satisfaction == 0 ? 'not answered' : 'called';
		clientCampaign.startCall = new Date();
		clientCampaign.endCall = new Date();
		clientCampaign.satisfaction = req.body.satisfaction;
		if (req.body.comment && req.body.comment.trim().length > 0) {
			clientCampaign.comment = req.body.comment.trim();
		}
	} else if (req.body.satisfaction == -2) {
		await Campaign.updateOne({ _id: curentCampaign._id }, { $push: { trashUser: client._id } });
		log(`delete ${client.phone} client from ${caller.name} ${caller.name} (${ip})`, 'INFORMATION', 'endCall.ts');
	}
	caller.curentCall = null;
	caller.timeInCall.push({ date: new Date(), client: client._id, time: req.body.timeInCall });

	if (req.body.satisfaction != -2) await Promise.all([caller.save(), client.save()]);
	else await caller.save();

	res.status(200).send({ message: 'OK', OK: true });
	log(`end virtual call from ${caller.name} (${ip})`, 'INFORMATION', 'endCall.ts');
}
