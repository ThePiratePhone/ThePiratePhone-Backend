import { Request, Response } from 'express';

import { Client } from '../../Models/Client';
import { Area } from '../../Models/area';

import AreaCampaignProgress from '../../tools/areaCampaignProgress';
import checkCredentials from '../../tools/checkCredentials';
import { log } from '../../tools/log';
import { ObjectId } from 'mongodb';
import { Caller } from '../../Models/Caller';

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
		log(`Area not found from: ${caller.name} (${ip})`, 'WARNING', 'getProgress.ts');
		return;
	}
	const campaign = (await AreaCampaignProgress(area)) as any;
	if (!campaign) {
		res.status(404).send({ message: 'campaign not found', OK: false });
		log(`Campaign not found from: ${caller.name} (${ip})`, 'WARNING', 'getProgress.ts');
		return;
	}

	const count = await Client.countDocuments({
		[`data.${campaign._id}`]: {
			$elemMatch: {
				status: 'called'
			}
		},
		_id: { $nin: campaign.trashUser }
	});

	//invalid if more of 20 000
	const clientInThisCampaign = await Client.find({
		[`data.${campaign._id}`]: { $exists: true, $not: { $size: 0 } },
		_id: { $nin: campaign.trashUser }
	}).limit(20_000);

	const callInThisCampaign = clientInThisCampaign.reduce((acc, client) => {
		acc += client.data.get(campaign._id)?.length ?? 0;
		return acc;
	}, 0);

	const callMake = clientInThisCampaign.filter(
		call => call.data[campaign._id]?.caller.toString() ?? '' == caller._id.toString()
	);

	const convertion = callMake.reduce((acc, call) => {
		acc += call.data[campaign._id].status == 'called' && call.data[campaign._id].satisfaction == 2 ? 1 : 0;
		return acc;
	}, 0);

	const totalConvertion = clientInThisCampaign.reduce((acc, call) => {
		const length = call.data[campaign._id]?.length ?? 0;
		acc +=
			call.data.get(campaign._id)?.[length]?.status == 'called' &&
			call.data.get(campaign._id)?.[length]?.satisfaction == 2
				? 1
				: 0;
		return acc;
	}, 0);

	const totalTime = callMake.reduce((acc, call) => {
		acc += (call.data[campaign._id].endCall - call.data[campaign._id].startCall) / 1000;
		return acc;
	}, 0);

	res.status(200).send({
		message: 'OK',
		OK: true,
		data: {
			count: count,
			callerUniqueCall: callMake.length,
			callInThisCampaign: callInThisCampaign,
			total: clientInThisCampaign.length,
			totalTime: totalTime,
			convertion: convertion,
			totalConvertion: totalConvertion
		}
	});
	log(`Get progress from: ${caller.name} (${ip})`, 'INFORMATION', 'getProgress.ts');
}
