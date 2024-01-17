import { Request, Response } from 'express';
import { log } from '../tools/log';
import { Area } from '../Models/area';
import { Caller } from '../Models/Caller';
import { Campaign } from '../Models/Campaign';

export default async function addCallerCampaign(req: Request<any>, res: Response<any>) {
	const ip = req.socket?.remoteAddress?.split(':').pop();
	if (
		!req.body ||
		typeof req.body.campaign != 'string' ||
		typeof req.body.Phone != 'string' ||
		typeof req.body.adminCode != 'string'
	) {
		res.status(400).send({ message: 'Missing parameters', OK: false });
		log('Missing parameters', 'WARNING', 'addCallerCampaign.ts');
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

	const caller = await Caller.findOne({ phone: req.body.Phone, area: area._id });
	if (!caller || area._id != caller.area) {
		res.status(404).send({ message: 'User not found', OK: false });
		log('User not found', 'WARNING', 'addCallerCampaign.ts');
		return;
	}

	const campaign = await Campaign.findOne({ name: req.body.campaign, area: area._id });
	if (!campaign) {
		res.status(404).send({ message: 'Campaign not found', OK: false });
		log('Campaign not found', 'WARNING', 'addCallerCampaign.ts');
		return;
	}

	if (campaign.callerList.includes(caller._id)) {
		res.status(200).send({ message: 'User already in campaign', OK: true });
		log('User already in campaign', 'WARNING', 'addCallerCampaign.ts');
		return;
	}
	await campaign.updateOne({ $push: { callerList: caller._id } });
}
