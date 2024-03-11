import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import { log } from '../../tools/log';
import { Client } from '../../Models/Client';
import { Area } from '../../Models/Area';
import getCurrentCampaign from '../../tools/getCurrentCampaign';

export default async function callStats(req: Request<any>, res: Response<any>) {
	const ip = req.socket?.remoteAddress?.split(':').pop();

	if (
		!req.body ||
		!ObjectId.isValid(req.body.campaign) ||
		typeof req.body.adminCode != 'string' ||
		!ObjectId.isValid(req.body.area)
	) {
		res.status(400).send({ message: 'Missing parameters', OK: false });
		log('Missing parameters from ' + ip, 'WARNING', 'callStats.ts');
		return;
	}

	const area = await Area.findOne({ _id: req.body.area, AdminPassword: req.body.adminCode });
	if (!area) {
		res.status(401).send({ message: 'Wrong Creantial', OK: false });
		log('Wrong Creantial from ' + ip, 'WARNING', 'callStats.ts');
		return;
	}

	const campaign = (await getCurrentCampaign(area._id)) as any;
	if (!campaign) {
		res.status(404).send({ message: 'campaign not found', OK: false });
		log(`Campaign not found from: ${area.name} (${ip})`, 'WARNING', 'callStats.ts');
		return;
	}

	const clientInThisCampaign = await Client.find({
		[`data.${campaign._id}`]: { $exists: true, $not: { $size: 0 } },
		_id: { $nin: campaign.trashUser }
	}).cursor();

	let totalClientCalled = 0;
	let totalCall = 0;
	let totalUser = 0;
	let totalConvertion = 0;
	let totalTime = 0;
	await clientInThisCampaign.eachAsync(client => {
		totalUser++;
		const data = client.data.get(campaign._id);
		data?.forEach(call => {
			if (call.status == 'not called') return;

			totalCall += data?.length ?? 0;
			totalClientCalled++;
			totalTime += (call.endCall ?? new Date()).getTime() - (call.startCall ?? new Date()).getTime();
			if (call.status == 'called' && call.satisfaction == 2) totalConvertion++;
		});
	});

	res.status(200).send({
		message: 'OK',
		OK: true,
		data: {
			totalClientCalled: totalClientCalled,
			totalCall: totalCall,
			totalUser: totalUser,
			totalConvertion: totalConvertion,
			totalTime: totalTime
		}
	});

	log(`call stats get by ${area.name} (${ip})`, 'INFORMATION', 'callStats.ts');
}
