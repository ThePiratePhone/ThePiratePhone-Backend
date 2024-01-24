import { Request, Response } from 'express';
import { log } from '../tools/log';
import { Area } from '../Models/area';
import { Client } from '../Models/Client';
import { Campaign } from '../Models/Campaign';
import mongoose from 'mongoose';

export default async function addClientCampaign(req: Request<any>, res: Response<any>) {
	const ip = req.socket?.remoteAddress?.split(':').pop();
	if (
		!req.body ||
		typeof req.body.campaign != 'string' ||
		typeof req.body.phone != 'string' ||
		typeof req.body.adminCode != 'string'
	) {
		res.status(400).send({ message: 'Missing parameters', OK: false });
		log('Missing parameters', 'WARNING', 'addClientCampaign.ts');
		return;
	}

	const area = await Area.findOne({ AdminPassword: req.body.adminCode });
	if (!area) {
		res.status(401).send({ message: 'Wrong admin code', OK: false });
		log('Wrong admin code from ' + ip, 'WARNING', 'login.ts');
		return;
	}

	if (req.body.Phone.startsWith('0')) {
		req.body.Phone = req.body.Phone.replace('0', '+33');
	}

	const client = await Client.findOne({ phone: req.body.Phone, area: area._id });
	if (!client) {
		res.status(404).send({ message: 'User not found', OK: false });
		log('User not found', 'WARNING', 'addClientCampaign.ts');
		return;
	}

	const campaign = await Campaign.findOne({ name: req.body.campaign, area: area._id });
	if (!campaign) {
		res.status(404).send({ message: 'Campaign not found', OK: false });
		log('Campaign not found', 'WARNING', 'addClientCampaign.ts');
		return;
	}

	if (campaign.userList.includes(client._id) || client.data.has(campaign._id.toString())) {
		res.status(200).send({ message: 'User already in campaign', OK: true });
		log('User already in campaign', 'WARNING', 'addClientCampaign.ts');
		return;
	}

	const newData = new mongoose.Types.DocumentArray([{ status: 'not called' }]) as any;
	client.data.set(campaign._id.toString(), newData);
	await Promise.all([client.save(), campaign.updateOne({ $push: { userList: client._id } })]);

	res.status(200).send({ message: 'User added to campaign', OK: true });
	log('User added to campaign', 'INFORMATION', 'addClientCampaign.ts');
}
