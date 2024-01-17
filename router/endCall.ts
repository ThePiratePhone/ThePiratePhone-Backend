import { Request, Response } from 'express';
import checkCredential from '../tools/checkCreantial';
import { log } from '../tools/log';
import { Client } from '../Models/Client';
import getCurentCampaign from '../tools/getCurentCampaign';
import mongoose from 'mongoose';

export default async function endCall(req: Request<any>, res: Response<any>) {
	const ip = req.socket?.remoteAddress?.split(':').pop();
	if (
		!req.body ||
		typeof req.body.phone != 'string' ||
		typeof req.body.pinCode != 'string' ||
		typeof req.body.area != 'string' ||
		typeof req.body.timeInCall != 'string' ||
		typeof req.body.satisfaction != 'string' ||
		typeof req.body.status != 'string'
	) {
		res.status(400).send({ message: 'Missing parameters', OK: false });
		log(`Missing parameters`, 'ERROR', 'endCall');
		return;
	}

	if (isNaN(parseInt(req.body.timeInCall))) {
		res.status(400).send({ message: 'timeInCall is not a number', OK: false });
		log(`timeInCall is not a number from ` + ip, 'ERROR', 'endCall');
		return;
	}

	if (
		isNaN(parseInt(req.body.satisfaction)) ||
		parseInt(req.body.satisfaction) < 0 ||
		parseInt(req.body.satisfaction) > 5
	) {
		res.status(400).send({ message: 'satisfaction is not a number', OK: false });
		log(`satisfaction is not a number from ` + ip, 'ERROR', 'endCall');
		return;
	}

	if (req.body.status != 'not answered' || req.body.status != 'called') {
		res.status(400).send({ message: 'status is not valid', OK: false });
		log(`status is not valid from ` + ip, 'ERROR', 'endCall');
		return;
	}

	const caller = await checkCredential(req.body.phone, req.body.area, req.body.pinCode);
	if (!caller) {
		res.status(403).send({ message: 'Invalid credential', OK: false });
		log(`Invalid credential from ` + ip, 'ERROR', 'endCall');
		return;
	}

	if (typeof caller.curentCall != 'string') {
		res.status(400).send({ message: 'Not in a call', OK: false });
		log(`Not in a call from ` + ip, 'ERROR', 'endCall');
		return;
	}

	const client = await Client.findOne({ phone: caller.curentCall });
	if (!client) {
		res.status(400).send({ message: 'Not in a call', OK: false });
		log(`Not in a call from ` + ip, 'ERROR', 'endCall');
		return;
	}

	const curentCampaign: any = await getCurentCampaign(req.body.area);
	if (!curentCampaign) {
		res.status(400).send({ message: 'no actual Camaing', OK: false });
		log(`no actual Camaing from ` + ip, 'ERROR', 'endCall');
		return;
	}
	let nbCall = client.data.get(curentCampaign._id.toString())?.length;
	if (!nbCall) {
		const newData = new mongoose.Types.DocumentArray([{ status: 'not called' }]) as any;
		client.data.set(curentCampaign._id.toString(), newData);
		nbCall = 1;
	}

	const clientCampaign = (client.data.get(curentCampaign._id.toString()) as unknown as Map<string, any>)[nbCall - 1];
	if (!clientCampaign) {
		res.status(500).send({ message: 'Internal error', OK: false });
		return;
	}
	if (!clientCampaign) {
		res.status(500).send({ message: 'Internal error', OK: false });
		log(`Internal error from ` + ip, 'ERROR', 'endCall');
		return;
	}
	clientCampaign.status = req.body.status;
	clientCampaign.startCall = new Date(Date.now() - parseInt(req.body.timeInCall));
	clientCampaign.endCall = new Date();
	clientCampaign.satisfaction = parseInt(req.body.satisfaction);
	caller.curentCall = null;
	caller.timeInCall.push([new Date(), client._id, new Date(parseInt(req.body.timeInCall))]);
	await Promise.all([caller.save(), client.save()]);
	res.status(200).send({ message: 'OK', OK: true });
	log(`end call from ` + ip, 'INFORMATION', 'endCall');
}
