import { Request, Response } from 'express';
import { Log } from '../tools/log';
import { Area } from '../Models/area';
import { Client } from '../Models/Client';
import { Campaign } from '../Models/Campaign';

export default async function addClientCampaing(req: Request<any>, res: Response<any>) {
	const ip = req.socket?.remoteAddress?.split(':').pop();
	if (
		!req.body ||
		typeof req.body.campaign != 'string' ||
		typeof req.body.Phone != 'string' ||
		typeof req.body.adminCode != 'string'
	) {
		res.status(400).send({ message: 'Missing parameters', OK: false });
		Log('Missing parameters', 'WARNING', 'addClientCampaing.ts');
		return;
	}

	const area = await Area.findOne({ AdminPassword: req.body.adminCode });
	if (!area) {
		res.status(401).send({ message: 'Wrong admin code', OK: false });
		Log('Wrong admin code from ' + ip, 'WARNING', 'Login.ts');
		return;
	}

	if (req.body.Phone.startsWith('0')) {
		req.body.Phone = req.body.Phone.replace('0', '+33');
	}

	const client = await Client.findOne({ phone: req.body.Phone });
	if (!client || area._id != client.area) {
		res.status(404).send({ message: 'User not found', OK: false });
		Log('User not found', 'WARNING', 'addClientCampaing.ts');
		return;
	}

	const campaign = await Campaign.findOne({ name: req.body.campaign, area: area._id });
	if (!campaign) {
		res.status(404).send({ message: 'Campaign not found', OK: false });
		Log('Campaign not found', 'WARNING', 'addClientCampaing.ts');
		return;
	}

	if (campaign.userList.includes(client._id) || client.data.has(campaign._id.toString())) {
		res.status(200).send({ message: 'User already in campaign', OK: true });
		Log('User already in campaign', 'WARNING', 'addClientCampaing.ts');
		return;
	}

	client.data.set(campaign._id.toString(), { status: 'not called' });
	await Promise.all([client.save(), campaign.updateOne({ $push: { userList: client._id } })]);
}
