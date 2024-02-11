import { Request, Response } from 'express';

import { Client } from '../../Models/Client';
import { Area } from '../../Models/area';

import AreaCampaignProgress from '../../tools/areaCampaignProgress';
import checkCredentials from '../../tools/checkCredentials';
import { log } from '../../tools/log';
import { ObjectId } from 'mongodb';
import { Caller } from '../../Models/Caller';

type data = {
	status: 'called' | 'not called' | 'not answered' | 'inprogress';
	caller: ObjectId;
	startCall: Date;
	endCall: Date;
	satisfaction: -1 | 0 | 1 | 2;
};

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
		const data = client.data.get(campaign._id);
		if (data && data.length == 1) {
			if (data[0].status != 'not called') acc += data.length;
		} else {
			acc += client.data.get(campaign._id)?.length ?? 0;
		}
		return acc;
	}, 0);

	const callMake: Array<data> = [];
	clientInThisCampaign.forEach(client => {
		client.data.get(campaign._id)?.forEach(call => {
			if (call?.caller?.toString() ?? '' == caller._id.toString()) {
				callMake.push({
					status: call.status,
					caller: call.caller ?? new ObjectId(),
					startCall: call.startCall ?? new Date(),
					endCall: call.endCall ?? new Date(),
					satisfaction: (call.satisfaction as -1 | 0 | 1 | 2) ?? 0
				});
			}
		});
	});

	const convertion = callMake.reduce((acc, call) => {
		acc += call.status == 'called' && call.satisfaction == 2 ? 1 : 0;
		return acc;
	}, 0);

	const totalConvertion = clientInThisCampaign.reduce((acc, call) => {
		const data = call.data.get(campaign._id);
		if (data) acc += data[data.length - 1]?.status == 'called' && data[data.length - 1]?.satisfaction == 2 ? 1 : 0;
		return acc;
	}, 0);

	const Time = callMake.reduce((acc, call) => {
		acc += (call.endCall.getTime() - call.startCall.getTime()) / 1000;
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
			Time: Time,
			convertion: convertion,
			totalConvertion: totalConvertion
		}
	});
	log(`Get progress from: ${caller.name} (${ip})`, 'INFORMATION', 'getProgress.ts');
}
