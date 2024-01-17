import { Request, Response } from 'express';
import checkCredential from '../tools/checkCreantial';
import { log } from '../tools/log';
import { Client } from '../Models/Client';
import getCurentCampaign from '../tools/getCurentCampaign';

export default async function endCall(req: Request<any>, res: Response<any>) {
	const ip = req.socket?.remoteAddress?.split(':').pop();
	if (
		!req.body ||
		typeof req.body.phone != 'string' ||
		typeof req.body.pinCode != 'string' ||
		typeof req.body.area != 'string' ||
		typeof req.body.timeInCall != 'string'
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

	const clientCampaign = client.data.get(curentCampaign._id.toString());
	if (!clientCampaign) {
		res.status(500).send({ message: 'Internal error', OK: false });
		return;
	}
	if (!clientCampaign) {
		res.status(500).send({ message: 'Internal error', OK: false });
		log(`Internal error from ` + ip, 'ERROR', 'endCall');
		return;
	}

	clientCampaign.status = 'called';
	clientCampaign.endCall = new Date();
	caller.curentCall = null;
	caller.timeInCall.push([new Date(), client._id, parseInt(req.body.timeInCall)]);
	await Promise.all([caller.save(), client.save()]);
	res.status(200).send({ message: 'OK', OK: true });
	log(`end call from ` + ip, 'INFORMATION', 'endCall');
}
