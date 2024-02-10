import { Request, Response } from 'express';
import { log } from '../../tools/log';
import { Area } from '../../Models/area';
import { Client } from '../../Models/Client';
import { Campaign } from '../../Models/Campaign';
import mongoose from 'mongoose';
import clearPhone from '../../tools/clearPhone';

export default async function addClientCampaign(req: Request<any>, res: Response<any>) {
	const ip = req.socket?.remoteAddress?.split(':').pop();
	if (
		!req.body ||
		typeof req.body.campaign != 'string' ||
		typeof req.body.phone != 'string' ||
		typeof req.body.adminCode != 'string'
	) {
		res.status(400).send({ message: 'Missing parameters', OK: false });
		log(`Missing parameters from ` + ip, 'WARNING', 'addClientCampaign.ts');
		return;
	}

	const area = await Area.findOne({ AdminPassword: req.body.adminCode });
	if (!area) {
		res.status(401).send({ message: 'Wrong admin code', OK: false });
		log(`Wrong admin code from ` + ip, 'WARNING', 'addClientCampaign.ts');
		return;
	}

	req.body.phone = clearPhone(req.body.phone);

	const client = await Client.findOne({ phone: req.body.phone, area: area._id });
	if (!client) {
		res.status(404).send({ message: 'User not found', OK: false });
		log(`User not found from ${area.name} (${ip})`, 'WARNING', 'addClientCampaign.ts');
		return;
	}

	const campaign = await Campaign.findOne({ _id: req.body.campaign, area: area._id });
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
