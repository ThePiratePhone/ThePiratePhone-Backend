import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';

import { Area } from '../../Models/Area';
import { Client } from '../../Models/Client';
import AreaCampaignProgress from '../../tools/areaCampaignProgress';
import checkCredentials from '../../tools/checkCredentials';
import { log } from '../../tools/log';

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

	//invalid if more of 10 000
	const clientInThisCampaign = await Client.find({
		[`data.${campaign._id}`]: { $exists: true, $not: { $size: 0 } },
		_id: { $nin: campaign.trashUser }
	}).cursor();

	let totalClientCalled = 0;
	let totaldiscution = 0;
	let totalCall = 0;
	let totalUser = 0;
	let totalConvertion = 0;
	let TimeInCall = 0;
	await clientInThisCampaign.eachAsync(client => {
		totalUser++;
		const data = client.data.get(campaign._id);
		data?.forEach(call => {
			if (call.status == 'not called') return;

			totalCall += data?.length ?? 0;
			totalClientCalled++;
			if (call?.caller?.toString() ?? '' == caller._id.toString()) {
				if (call.status == 'called') totaldiscution++;
				TimeInCall += (call.endCall ?? new Date()).getTime() - (call.startCall ?? new Date()).getTime();
				if (call.status == 'called' && call.satisfaction == 2) totalConvertion++;
			}
		});
	});

	res.status(200).send({
		message: 'OK',
		OK: true,
		data: {
			totalClientCalled: totalClientCalled,
			totaldiscution: totaldiscution,
			totalCall: totalCall,
			totalUser: totalUser,
			totalConvertion: totalConvertion,
			TimeInCall: TimeInCall
		}
	});
	log(`Get progress from: ${caller.name} (${ip})`, 'INFORMATION', 'getProgress.ts');
}
