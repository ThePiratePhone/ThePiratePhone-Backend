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

	let totalCalled = 0;
	let totalNotRespond = 0;
	let totalUser = 0;
	await Client.find({
		[`data.${campaign._id}`]: { $exists: true, $not: { $size: 0 } },
		_id: { $nin: campaign.trashUser }
	})
		.cursor()
		.eachAsync(client => {
			totalUser++;
			const data = client.data.get(campaign._id.toString());
			if (
				data &&
				data[data.length - 1] &&
				((data[data.length - 1].status != 'not called' && data[data.length - 1].status != 'not answered') ||
					data.length == campaign.nbMaxCallCampaign)
			)
				totalCalled++;
			if (data && data[data.length - 1].status == 'not answered') totalNotRespond++;
		});

	res.status(200).send({
		message: 'OK',
		OK: true,
		data: {
			totalCalled: totalCalled,
			totalNotRespond: totalNotRespond,
			totalUser: totalUser
		}
	});

	log(`call stats get by ${area.name} (${ip})`, 'INFORMATION', 'call.ts');
}
