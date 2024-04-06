import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import { Area } from '../../Models/Area';
import { Campaign } from '../../Models/Campaign';
import { Client } from '../../Models/Client';
import getCurrentCampaign from '../../tools/getCurrentCampaign';
import { log } from '../../tools/log';

export default async function call(req: Request<any>, res: Response<any>) {
	const ip = req.socket?.remoteAddress?.split(':').pop();

	if (
		!req.body ||
		(req.body.CampaignId && !ObjectId.isValid(req.body.CampaignId)) ||
		typeof req.body.adminCode != 'string' ||
		!ObjectId.isValid(req.body.area)
	) {
		res.status(400).send({ message: 'Missing parameters', OK: false });
		log('Missing parameters from ' + ip, 'WARNING', 'call.ts');
		return;
	}

	const area = await Area.findOne({ _id: req.body.area, AdminPassword: req.body.adminCode });
	if (!area) {
		res.status(401).send({ message: 'Wrong Creantial', OK: false });
		log('Wrong Creantial from ' + ip, 'WARNING', 'call.ts');
		return;
	}

	let campaign;
	if (!req.body.CampaignId) campaign = await getCurrentCampaign(area.id);
	else campaign = Campaign.findOne({ _id: req.body.CampaignId, area: req.body.area });

	if (!campaign || campaign == null) {
		res.status(404).send({ message: 'no campaign in progress or campaign not found', OK: false });
		log(`No campaign in progress or campaign not found from: ${area.name} (${ip})`, 'WARNING', 'call.ts');
		return;
	}

	const clientInThisCampaign = Client.find({
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
		const data = client.data.get(campaign._id.toString());
		if (data && data[data.length - 1] && data[data.length - 1].status != 'not called') totalClientCalled++;
		data?.forEach(call => {
			if (call.status == 'not called') return;

			totalCall++;
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

	log(`call stats get by ${area.name} (${ip})`, 'INFORMATION', 'call.ts');
}
