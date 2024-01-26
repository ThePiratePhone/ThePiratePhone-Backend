import { Request, Response } from 'express';

import { Client } from '../../Models/Client';
import { Area } from '../../Models/area';

import AreaCampaignProgress from '../../tools/areaCampaignProgress';
import checkCredentials from '../../tools/checkCredentials';
import { log } from '../../tools/log';

export default async function getProgress(req: Request<any>, res: Response<any>) {
	const ip = req.socket?.remoteAddress?.split(':').pop();
	if (
		!req.body ||
		typeof req.body.phone != 'string' ||
		typeof req.body.pinCode != 'string' ||
		typeof req.body.area != 'string'
	) {
		res.status(400).send({ message: 'Missing parameters', OK: false });
		log(`Missing parameters from: ` + ip, 'WARNING', 'getProgress.ts');
		return;
	}

	const caller = await checkCredentials(req.body.phone, req.body.area, req.body.pinCode);
	if (!caller) {
		res.status(401).send({ message: 'Invalid credential', OK: false });
		log(`Invalid credential from: ` + ip, 'WARNING', 'getProgress.ts');
		return;
	}

	const area = await Area.findOne({ _id: req.body.area });
	if (!area) {
		res.status(500).send({ message: 'Internal error', OK: false });
		log(`Error while getting area`, 'CRITICAL', 'getProgress.ts');
		return;
	}
	const campaign = (await AreaCampaignProgress(area)) as any;
	if (!campaign) {
		res.status(500).send({ message: 'Internal error', OK: false });
		log(`Error while getting campaign`, 'CRITICAL', 'getProgress.ts');
		return;
	}
	const count = await Client.countDocuments({
		_id: { $in: campaign.userList },
		[`data.${campaign._id}.status`]: 'called'
	});

	res.status(200).send({ message: 'OK', OK: true, data: [count, campaign.userList.length] });
	log(`Get progress from: ` + ip, 'INFORMATION', 'getProgress.ts');
}
