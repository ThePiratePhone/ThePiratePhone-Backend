import { Request, Response } from 'express';

import { Client } from '../../Models/Client';
import { Area } from '../../Models/area';

import AreaCampaignProgress from '../../tools/areaCampaignProgress';
import checkCredentials from '../../tools/checkCredentials';
import { log } from '../../tools/log';
import { ObjectId } from 'mongodb';

export default async function getProgress(req: Request<any>, res: Response<any>) {
	const ip = req.socket?.remoteAddress?.split(':').pop();
	if (
		!req.body ||
		typeof req.body.phone != 'string' ||
		typeof req.body.pinCode != 'string' ||
		!ObjectId.isValid(req.body.area)
	) {
		res.status(400).send({ message: 'Missing parameters', OK: false });
		log(`Missing parameters from: ` + ip, 'WARNING', 'getProgress.ts');
		return;
	}

	const caller = await checkCredentials(req.body.phone, req.body.pinCode);
	if (!caller) {
		res.status(401).send({ message: 'Invalid credential', OK: false });
		log(`Invalid credential from: ` + ip, 'WARNING', 'getProgress.ts');
		return;
	}

	const area = await Area.findOne({ _id: req.body.area });
	if (!area) {
		res.status(404).send({ message: 'area not found', OK: false });
		log(`Area not found from: ` + ip, 'WARNING', 'getProgress.ts');
		return;
	}
	const campaign = (await AreaCampaignProgress(area)) as any;
	if (!campaign) {
		res.status(404).send({ message: 'campaign not found', OK: false });
		log(`Campaign not found from: ` + ip, 'WARNING', 'getProgress.ts');
		return;
	}

	const count = await Client.countDocuments({
		_id: { $in: campaign.userList },
		[`data.${campaign._id}.status`]: 'called'
	});

	const callMake = caller.timeInCall.filter(call => {
		return (call?.date?.getTime() ?? 0) > campaign.createdAt.getTime();
	});

	const CallInThisCampaign = callMake.filter(call => {
		return campaign.userList.includes(call.client);
	});

	const timeInCall = callMake.reduce((acc, call) => {
		return acc + (call.time ?? 0);
	}, 0);

	const timeInCallInThisCampaign = CallInThisCampaign.reduce((acc, call) => {
		return acc + (call.time ?? 0);
	}, 0);

	res.status(200).send({
		message: 'OK',
		OK: true,
		data: {
			count: count,
			callerCall: callMake.length,
			callInThisCampaign: CallInThisCampaign.length,
			timeInCall: timeInCall,
			timeInCallInThisCampaign: timeInCallInThisCampaign,
			total: campaign.userList.length
		}
	});
	log(`Get progress from: ` + ip, 'INFORMATION', 'getProgress.ts');
}
