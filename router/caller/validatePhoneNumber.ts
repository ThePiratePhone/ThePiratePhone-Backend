import { Request, Response } from 'express';

import { ObjectId } from 'mongodb';
import checkCredentials from '../../tools/checkCredentials';
import { log } from '../../tools/log';
import getCurentCampaign from '../../tools/getCurentCampaign';
import { Client } from '../../Models/Client';
import mongoose from 'mongoose';
import { Campaign } from '../../Models/Campaign';
import { Area } from '../../Models/area';

export default async function validatePhoneNumber(req: Request<any>, res: Response<any>) {
	const ip = req.socket?.remoteAddress?.split(':').pop();

	if (
		!req.body ||
		typeof req.body.phone != 'string' ||
		typeof req.body.pinCode != 'string' ||
		!ObjectId.isValid(req.body.userArea) ||
		typeof req.body.phoneNumber != 'string' ||
		typeof req.body.satisfaction != 'number'
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

	const curentCampaign: any = await getCurentCampaign(req.body.userArea);
	if (!curentCampaign) {
		res.status(400).send({ message: 'no actual Camaing', OK: false });
		log(`no actual Camaing from ` + ip, 'ERROR', 'validatePhoneNumber.ts');
		return;
	}

	if (!curentCampaign.callers.includes(caller._id)) {
		res.status(403).send({ message: 'Caller not in campaign', OK: false });
		log(`Caller not in campaign from: ` + ip, 'WARNING', 'validatePhoneNumber.ts');
		return;
	}

	const client = await Client.findOne({ phoneNumber: req.body.phoneNumber, _id: { $in: curentCampaign.userList } });
	if (!client) {
		res.status(404).send({ message: 'Client not found', OK: false });
		log(`Client not found from: ` + ip, 'WARNING', 'validatePhoneNumber.ts');
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
			log(`Internal error from ` + ip, 'ERROR', 'endCall.ts');
			return;
		}
		if (!clientCampaign) {
			res.status(500).send({ message: 'Internal error', OK: false });
			log(`Internal error from ` + ip, 'ERROR', 'endCall.ts');
			return;
		}
		clientCampaign.status = req.body.satisfaction == 0 ? 'not answered' : 'called';
		clientCampaign.startCall = new Date(Date.now() - req.body.timeInCall);
		clientCampaign.endCall = new Date();
		clientCampaign.satisfaction = req.body.satisfaction;
	} else if (req.body.satisfaction == -2) {
		await Campaign.updateOne(
			{ _id: curentCampaign._id },
			{ $pull: { userList: client._id }, $push: { trashUser: client._id } }
		);
		await Area.updateOne({ _id: curentCampaign.Area }, { $pull: { clientList: client._id } });
		log(`delete ${client.phone} client from ${caller.name} ` + ip, 'INFORMATION', 'endCall.ts');
	}
	caller.curentCall = null;
	caller.timeInCall.push({ date: new Date(), client: client._id, time: req.body.timeInCall });

	if (req.body.satisfaction != -2) await Promise.all([caller.save(), client.save()]);
	else await caller.save();

	res.status(200).send({ message: 'OK', OK: true });
	log(`end virtual call from ` + ip, 'INFORMATION', 'endCall.ts');
}
