import { Request, Response } from 'express';
import { log } from '../../tools/log';
import { Area } from '../../Models/area';
import { Caller } from '../../Models/Caller';
import { Campaign } from '../../Models/Campaign';

export default async function addCallerCampaign(req: Request<any>, res: Response<any>) {
	const ip = req.socket?.remoteAddress?.split(':').pop();
	if (
		!req.body ||
		typeof req.body.campaign != 'string' ||
		typeof req.body.phone != 'string' ||
		typeof req.body.adminCode != 'string'
	) {
		res.status(400).send({ message: 'Missing parameters', OK: false });
		log('Missing parameters', 'WARNING', 'addCallerCampaign.ts');
		return;
	}

	const area = await Area.findOne({ AdminPassword: req.body.adminCode });
	if (!area) {
		res.status(401).send({ message: 'Wrong admin code', OK: false });
		log('Wrong admin code from ' + ip, 'WARNING', 'addCallerCampaign.ts');
		return;
	}

	if (req.body.Phone.startsWith('0')) {
		req.body.Phone = req.body.Phone.replace('0', '+33');
	}

	const caller = await Caller.findOne({ phone: req.body.Phone, area: area._id });
	if (!caller) {
		res.status(404).send({ message: 'Caller not found', OK: false });
		log('Caller not found', 'WARNING', 'addCallerCampaign.ts');
		return;
	}

	const campaign = await Campaign.findOne({ _id: req.body.campaign, area: area._id });
	if (!campaign) {
		res.status(404).send({ message: 'Campaign not found', OK: false });
		log('Campaign not found', 'WARNING', 'addCallerCampaign.ts');
		return;
	}

	if (campaign.callerList.includes(caller._id)) {
		res.status(200).send({ message: 'Caller already in campaign', OK: true });
		log('Caller already in campaign', 'WARNING', 'addCallerCampaign.ts');
		return;
	}
	await campaign.updateOne({ $push: { callerList: caller._id } });

	res.status(200).send({ message: 'Caller added to campaign', OK: true });
	log('Caller added to campaign', 'INFORMATION', 'addCallerCampaign.ts');
}
