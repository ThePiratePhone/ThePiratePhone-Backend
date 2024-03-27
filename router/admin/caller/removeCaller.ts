import { ObjectId } from 'mongodb';
import { log } from '../../../tools/log';
import { Request, Response } from 'express';
import { Area } from '../../../Models/Area';
import { Caller } from '../../../Models/Caller';
import { Client } from '../../../Models/Client';
import getCurrentCampaign from '../../../tools/getCurrentCampaign';

export default async function removeCaller(req: Request<any>, res: Response<any>) {
	const ip = req.socket?.remoteAddress?.split(':').pop();
	if (
		!req.body ||
		typeof req.body.adminCode != 'string' ||
		typeof req.body.phone != 'string' ||
		!ObjectId.isValid(req.body.area)
	) {
		res.status(400).send({ message: 'Missing parameters', OK: false });
		log(`Missing parameters from ` + ip, 'WARNING', 'removeCaller.ts');
		return;
	}

	const area = await Area.findOne({ _id: req.body.area, password: req.body.AreaPassword });
	if (!area) {
		res.status(400).send({ message: 'Invalid area', OK: false });
		log(`Invalid area from: ${req.body.phone} (${ip})`, 'WARNING', 'removeCaller.ts');
		return;
	}

	const caller = await Caller.findOne({ phone: req.body.phone });
	if (!caller) {
		res.status(400).send({ message: 'Caller not found', OK: false });
		log(`Caller not found from: ${req.body.phone} (${ip})`, 'WARNING', 'removeCaller.ts');
		return;
	}

	if (caller.currentCall) {
		const campaign = await getCurrentCampaign(area._id);
		const client = await Client.findOne({ _id: caller?.currentCall?.client?.toString() });
		if (client) {
			try {
				client.data.get(campaign?._id?.toString() ?? '')?.pop();
				await client.save();
			} catch (e) {
				log(`Error while removing client from caller: ${e}`, 'ERROR', 'removeCaller.ts');
			}
		}
	}
	const remove = await Caller.deleteOne({ phone: req.body.phone });
	if (remove.deletedCount == 1) {
		res.status(200).send({ message: 'Caller removed', OK: true });
		log(`Caller removed: ${req.body.phone} (${ip})`, 'INFORMATION', 'removeCaller.ts');
	} else {
		res.status(500).send({ message: 'Error while removing caller', OK: false });
		log(`Error while removing caller: ${req.body.phone} (${ip})`, 'ERROR', 'removeCaller.ts');
	}
}
