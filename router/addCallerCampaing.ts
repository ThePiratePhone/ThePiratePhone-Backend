import { Request, Response } from 'express';
import { Log } from '../tools/log';
import { Area } from '../Models/area';
import { Caller } from '../Models/Caller';
import { Campaign } from '../Models/Campaign';

export default async function addCallerCampaing(req: Request<any>, res: Response<any>) {
	const ip = req.socket?.remoteAddress?.split(':').pop();
	if (
		!req.body ||
		typeof req.body.campaign != 'string' ||
		typeof req.body.Phone != 'string' ||
		typeof req.body.adminCode != 'string'
	) {
		res.status(400).send({ message: 'Missing parameters', OK: false });
		Log('Missing parameters', 'WARNING', 'addCallerCampaing.ts');
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

	const caller = await Caller.findOne({ phone: req.body.Phone, area: area._id });
	if (!caller || area._id != caller.area) {
		res.status(404).send({ message: 'User not found', OK: false });
		Log('User not found', 'WARNING', 'addCallerCampaing.ts');
		return;
	}

	const campaign = await Campaign.findOne({ name: req.body.campaign, area: area._id });
	if (!campaign) {
		res.status(404).send({ message: 'Campaign not found', OK: false });
		Log('Campaign not found', 'WARNING', 'addCallerCampaing.ts');
		return;
	}

	if (campaign.callerList.includes(caller._id)) {
		res.status(200).send({ message: 'User already in campaign', OK: true });
		Log('User already in campaign', 'WARNING', 'addCallerCampaing.ts');
		return;
	}
	await campaign.updateOne({ $push: { callerList: caller._id } });
}
