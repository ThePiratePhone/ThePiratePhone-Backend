import { Request, Response } from 'express';
import checkCredentials from '../tools/checkCredentials';
import AreaCampaignProgress from '../tools/areaCampaignProgress';
import { log } from '../tools/log';

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
	const count = await AreaCampaignProgress(req.body.area);
	res.status(200).send({ message: 'OK', OK: true, data: count });
	log(`Get progress from: ` + ip, 'INFORMATION', 'getProgress');
}
