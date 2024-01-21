import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';

import { Campaign } from '../Models/Campaign';
import { Client } from '../Models/Client';
import { Area } from '../Models/area';
import checkCredentials from '../tools/checkCredentials';
import { log } from '../tools/log';
import AreaCampaignProgress from '../tools/areaCampaignProgress';

export default async function getPhoneNumber(req: Request<any>, res: Response<any>) {
	const ip = req.socket?.remoteAddress?.split(':').pop();
	if (
		!req.body ||
		typeof req.body.phone != 'string' ||
		typeof req.body.pinCode != 'string' ||
		typeof req.body.area != 'string'
	) {
		res.status(400).send({ message: 'Missing parameters', OK: false });
		log(`Missing parameters from: ` + ip, 'WARNING', 'getPhoneNumber');
		return;
	}

	const caller = await checkCredentials(req.body.phone, req.body.area, req.body.pinCode);
	if (!caller) {
		res.status(403).send({ message: 'Invalid credential', OK: false });
		log(`Invalid credential from: ` + ip, 'WARNING', 'getPhoneNumber');
		return;
	}

	const area = await Area.findOne({ _id: req.body.area });
	if (!area) {
		res.status(500).send({ message: 'Internal error', OK: false });
		log(`Error while getting area`, 'CRITICAL', 'getPhoneNumber');
		return;
	}

	const campaign = AreaCampaignProgress(area._id) as any;

	if (!campaign) {
		res.status(500).send({ message: 'Internal error', OK: false });
		log(`Error while getting campaign`, 'CRITICAL', 'getPhoneNumber');
		return;
	}

	if (typeof caller.curentCall == typeof ObjectId) {
		const client = await Client.findOne({ _id: caller.curentCall });
		if (!client) {
			caller.curentCall = null;
		} else {
			res.status(400).send({
				message: 'Already in a call',
				OK: false,
				client: client,
				script: campaign.script[campaign.script.length - 1]
			});
			log(`Already in a call from: ` + ip, 'WARNING', 'getPhoneNumber');
			return;
		}
	}

	//find first client with status not called
	const threeHoursAgo = new Date();
	threeHoursAgo.setHours(threeHoursAgo.getHours() - 3);
	let client = await Client.findOne({
		$or: [
			{
				_id: { $in: area.ClientList },
				'data.$size': 5,
				'data.$last.status': 'not answered',
				'data.$last.endCall': { $lte: threeHoursAgo }
			},
			{
				_id: { $in: area.ClientList },
				'data.$last.status': 'not called'
			}
		]
	});
	if (!client) {
		res.status(400).send({ message: 'No client available', OK: false });
		log(`No client available from: ` + ip, 'WARNING', 'getPhoneNumber');
		return;
	} else {
		const clientCampaign = client.data.get(campaign._id.toString());
		if (!clientCampaign) {
			res.status(500).send({ message: 'Internal error', OK: false });
			log(`Error while getting client campaign`, 'CRITICAL', 'getPhoneNumber');
			return;
		}

		const last = clientCampaign.length - 1;
		caller.curentCall = client._id;
		clientCampaign[last].status = 'inprogress';
		clientCampaign[last].startCall = new Date();
		clientCampaign[last].caller = caller._id;
		clientCampaign[last].scriptVersion = campaign.script.length - 1;

		await Promise.all([caller.save(), client.save()]);
		res.status(200).send({
			message: 'OK',
			OK: true,
			data: { client: client, script: campaign.script[campaign.script.length - 1] }
		});
		log(`Get phone number success for ${caller.name} from: ` + ip, 'INFORMATION', 'getPhoneNumber');
		return;
	}
}
