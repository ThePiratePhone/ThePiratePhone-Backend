import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import mongoose from 'mongoose';

import { Area } from '../../../Models/Area';
import { Campaign } from '../../../Models/Campaign';
import { Client } from '../../../Models/Client';
import clearPhone from '../../../tools/clearPhone';
import { log } from '../../../tools/log';
import getCurrentCampaign from '../../../tools/getCurrentCampaign';

export default async function addClientCampaign(req: Request<any>, res: Response<any>) {
	const ip = req.socket?.remoteAddress?.split(':').pop();
	if (
		!req.body ||
		(req.body.campaign && !ObjectId.isValid(req.body.campaign)) ||
		typeof req.body.phone != 'string' ||
		typeof req.body.adminCode != 'string' ||
		!ObjectId.isValid(req.body.area)
	) {
		res.status(400).send({ message: 'Missing parameters', OK: false });
		log(`Missing parameters from ` + ip, 'WARNING', 'addClientCampaign.ts');
		return;
	}

	const area = await Area.findOne({ AdminPassword: req.body.adminCode, _id: req.body.area });
	if (!area) {
		res.status(401).send({ message: 'Wrong admin code', OK: false });
		log(`Wrong admin code from ` + ip, 'WARNING', 'addClientCampaign.ts');
		return;
	}

	req.body.phone = clearPhone(req.body.phone);

	const client = await Client.findOne({ phone: req.body.phone });
	if (!client) {
		res.status(404).send({ message: 'User not found', OK: false });
		log(`User not found from ${area.name} (${ip})`, 'WARNING', 'addClientCampaign.ts');
		return;
	}

	let campaign: InstanceType<typeof Campaign> | null = null;

	if (req.body.campaign) {
		campaign = await Campaign.findOne({ _id: req.body.campaign, area: area._id });
	} else {
		campaign = await getCurrentCampaign(area._id);
	}
	if (!campaign) {
		res.status(404).send({ message: 'Campaign not found', OK: false });
		log(`Campaign not found from ${area.name} (${ip})`, 'WARNING', 'addClientCampaign.ts');
		return;
	}

	if (client.data.has(campaign._id.toString())) {
		res.status(200).send({ message: 'User already in campaign', OK: true });
		log(`User already in campaign from ${area.name} (${ip})`, 'WARNING', 'addClientCampaign.ts');
		return;
	}

	const newData = new mongoose.Types.DocumentArray([{ status: 'not called' }]) as any;
	client.data.set(campaign._id.toString(), newData);
	await client.save();

	res.status(200).send({ message: 'User added to campaign', OK: true });
	log(`User added to campaign from ${area.name} (${ip})`, 'INFORMATION', 'addClientCampaign.ts');
}
