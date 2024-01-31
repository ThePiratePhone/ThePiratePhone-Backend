import { Request, Response } from 'express';

import { log } from '../../tools/log';
import { ObjectId } from 'mongodb';
import checkCredentials from '../../tools/checkCredentials';
import getCurentCampaign from '../../tools/getCurentCampaign';
import { Campaign } from '../../Models/Campaign';

export default async function joinCampaign(req: Request<any>, res: Response<any>) {
	const ip = req.socket?.remoteAddress?.split(':').pop();

	if (
		!req.body ||
		typeof req.body.phone != 'string' ||
		typeof req.body.pinCode != 'string' ||
		!ObjectId.isValid(req.body.area) ||
		typeof req.body.campaignPassword != 'string'
	) {
		res.status(400).send({ message: 'Missing parameters', OK: false });
		log(`Missing parameters from: ` + ip, 'WARNING', 'joinCampaign.ts');
		return;
	}

	const caller = await checkCredentials(req.body.phone, req.body.pinCode);
	if (!caller) {
		res.status(403).send({ message: 'Wrong credentials', OK: false });
		log(`Wrong credentials from: ` + ip, 'WARNING', 'joinCampaign.ts');
		return;
	}

	const curentCampaign: any = await getCurentCampaign(req.body.area);
	if (!curentCampaign) {
		res.status(400).send({ message: 'no actual Camaing', OK: false });
		log(`no actual Camaing from ` + ip, 'ERROR', 'joinCampaign.ts');
		return;
	}

	if (curentCampaign.password != req.body.campaignPassword) {
		res.status(403).send({ message: 'Wrong campaign password', OK: false });
		log(`Wrong campaign password from: ` + ip, 'WARNING', 'joinCampaign.ts');
		return;
	}

	if (curentCampaign.callers.includes(caller._id)) {
		res.status(403).send({ message: 'Caller already in campaign', OK: false });
		log(`Caller already in campaign from: ` + ip, 'WARNING', 'joinCampaign.ts');
		return;
	}

	await Campaign.updateOne({ _id: curentCampaign._id }, { $push: { callers: caller._id } });
}
