import { Request, Response } from 'express';
import checkCredentials from '../tools/checkCredentials';
import AreaCampaignProgress from '../tools/areaCampaignProgress';
import { log } from '../tools/log';
import { Client } from '../Models/Client';

export default async function getProgress(req: Request<any>, res: Response<any>) {
	const ip = req.socket?.remoteAddress?.split(':').pop();
	if (
		!req.body ||
		typeof req.body.phone != 'string' ||
		typeof req.body.pinCode != 'string' ||
		typeof req.body.area != 'string'
	) {
		res.status(400).send({ message: 'Missing parameters', OK: false });
		log(`Missing parameters from: ` + ip, 'WARNING', 'getProgress');
		return;
	}

	if (req.body.phone.startsWith('0')) {
		req.body.phone = req.body.phone.replace('0', '+33');
	}

	const caller = await checkCredentials(req.body.phone, req.body.area, req.body.pinCode);
	if (!caller) {
		res.status(401).send({ message: 'Invalid credential', OK: false });
		log(`Invalid credential from: ` + ip, 'WARNING', 'getProgress');
		return;
	}
	const campaign = (await AreaCampaignProgress(req.body.area)) as any;
	if (!campaign) {
		res.status(500).send({ message: 'Internal error', OK: false });
		log(`Error while getting campaign`, 'CRITICAL', 'getProgress');
		return;
	}
	const count = await Client.countDocuments({
		area: { $in: campaign.ClientList },
		data: { $elemMatch: { status: 'called' } }
	});
	res.status(200).send({ message: 'OK', OK: true, data: [count, campaign.userList.length] });
	log(`Get progress from: ` + ip, 'INFORMATION', 'getProgress');
}
