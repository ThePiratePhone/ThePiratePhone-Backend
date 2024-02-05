import { Request, Response } from 'express';
import checkCredentials from '../../tools/checkCredentials';
import { log } from '../../tools/log';
import { Client } from '../../Models/Client';
import getCurentCampaign from '../../tools/getCurentCampaign';
import mongoose from 'mongoose';
import { ObjectId } from 'mongodb';
import { Campaign } from '../../Models/Campaign';
import { Area } from '../../Models/area';

export default async function endCall(req: Request<any>, res: Response<any>) {
	const ip = req.socket?.remoteAddress?.split(':').pop();
	if (
		!req.body ||
		typeof req.body.phone != 'string' ||
		typeof req.body.pinCode != 'string' ||
		!ObjectId.isValid(req.body.area) ||
		typeof req.body.timeInCall != 'number' ||
		typeof req.body.satisfaction != 'number'
	) {
		res.status(400).send({ message: 'Missing parameters', OK: false });
		log(`Missing parameters`, 'ERROR', 'endCall.ts');
		return;
	}

	if (isNaN(req.body.timeInCall)) {
		res.status(400).send({ message: 'timeInCall is not a number', OK: false });
		log(`timeInCall is not a number from ` + ip, 'ERROR', 'endCall.ts');
		return;
	}

	if (isNaN(req.body.satisfaction) || req.body.satisfaction < -2 || req.body.satisfaction > 2) {
		res.status(400).send({ message: 'satisfaction is not a valid number', OK: false });
		log(`satisfaction is not a valid number from ` + ip, 'ERROR', 'endCall.ts');
		return;
	}

	const caller = await checkCredentials(req.body.phone, req.body.pinCode);
	if (!caller) {
		res.status(403).send({ message: 'Invalid credential', OK: false });
		log(`Invalid credential from ` + ip, 'ERROR', 'endCall.ts');
		return;
	}
	if (!caller.curentCall || !caller.curentCall.client) {
		res.status(400).send({ message: 'Not in a call', OK: false });
		log(`Not in a call from ` + ip, 'ERROR', 'endCall.ts');
		return;
	}

	const client = await Client.findOne({ _id: caller.curentCall.client.toString() });
	if (!client) {
		res.status(400).send({ message: 'Not in a call', OK: false });
		log(`Not in a call from ` + ip, 'ERROR', 'endCall.ts');
		return;
	}

	const curentCampaign: any = await getCurentCampaign(req.body.area);
	if (!curentCampaign) {
		res.status(404).send({ message: 'no actual Camaing', OK: false });
		log(`no actual Camaing from ` + ip, 'ERROR', 'endCall.ts');
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
		await Area.updateOne({ _id: curentCampaign.Area }, { $pull: { clientList: client._id } });
		log(`delete ${client.phone} client from ${caller.name} ` + ip, 'INFORMATION', 'endCall.ts');
	} else {
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
	}
	caller.curentCall = null;
	caller.timeInCall.push({ date: new Date(), client: client._id, time: req.body.timeInCall });

	if (req.body.satisfaction != -2) await Promise.all([caller.save(), client.save()]);
	else await caller.save();
	res.status(200).send({ message: 'OK', OK: true });
	log(`end call from ` + ip, 'INFORMATION', 'endCall.ts');
}
