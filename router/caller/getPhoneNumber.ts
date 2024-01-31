import { Request, Response } from 'express';

import { Client } from '../../Models/Client';
import { Area } from '../../Models/area';
import AreaCampaignProgress from '../../tools/areaCampaignProgress';
import checkCredentials from '../../tools/checkCredentials';
import { log } from '../../tools/log';
import { ObjectId } from 'mongodb';

export default async function getPhoneNumber(req: Request<any>, res: Response<any>) {
	const ip = req.socket?.remoteAddress?.split(':').pop();
	if (
		!req.body ||
		typeof req.body.phone != 'string' ||
		typeof req.body.pinCode != 'string' ||
		!ObjectId.isValid(req.body.area)
	) {
		res.status(400).send({ message: 'Missing parameters', OK: false });
		log(`Missing parameters from: ` + ip, 'WARNING', 'getPhoneNumber.ts');
		return;
	}

	const caller = await checkCredentials(req.body.phone, req.body.pinCode);
	if (!caller) {
		res.status(403).send({ message: 'Invalid credential', OK: false });
		log(`Invalid credential from: ` + ip, 'WARNING', 'getPhoneNumber.ts');
		return;
	}

	const area = await Area.findOne({ _id: req.body.area });
	if (!area) {
		res.status(500).send({ message: 'Internal error', OK: false });
		log(`Error while getting area`, 'CRITICAL', 'getPhoneNumber.ts');
		return;
	}

	const campaign = (await AreaCampaignProgress(area)) as any;

	if (!campaign) {
		res.status(400).send({ message: 'no campaign in progress', OK: false });
		log(`No campaign in progress from: ` + ip, 'WARNING', 'getPhoneNumber.ts');
		return;
	}

	if (campaign.area != area._id || !campaign.callerList.includes(caller._id)) {
		res.status(403).send({ message: 'You are not allowed to call this campaign', OK: false });
		log(`Caller not allowed to call this campaign from: ` + ip, 'WARNING', 'getPhoneNumber.ts');
		return;
	}

	if (typeof caller.curentCall == 'object') {
		const client = await Client.findOne({ _id: caller.curentCall });
		if (!client) {
			caller.curentCall = null;
		} else {
			res.status(400).send({
				message: 'Already in a call',
				OK: true,
				client: client,
				script: campaign.script[campaign.script.length - 1]
			});
			log(`Already in a call from: ` + ip, 'WARNING', 'getPhoneNumber.ts');
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
				[`data.${campaign._id}`]: { $exists: true, $not: { $size: 0 } },
				[`data.${campaign._id}`]: {
					$elemMatch: {
						status: 'not answered',
						endCall: { $lte: new Date(Date.now() - 10_800_000) }
					}
				}
			},
			{
				_id: { $in: area.ClientList },
				[`data.${campaign._id}`]: { $exists: true, $not: { $size: 0 } },
				[`data.${campaign._id}`]: { $elemMatch: { status: 'not called' } }
			}
		]
	});
	if (!client) {
		res.status(400).send({ message: 'No client available', OK: false });
		log(`No client available from: ` + ip, 'WARNING', 'getPhoneNumber.ts');
		return;
	} else {
		const clientCampaign = client.data.get(campaign._id);
		if (!clientCampaign) {
			res.status(500).send({ message: 'Internal error', OK: false });
			log(`Error while getting client campaign`, 'WARNING', 'getPhoneNumber.ts');
			return;
		}

		const last = clientCampaign.length - 1;
		caller.curentCall = client._id;
		clientCampaign[last].status = 'inprogress';
		clientCampaign[last].caller = caller._id;
		clientCampaign[last].scriptVersion = campaign.script.length - 1;
		await Promise.all([caller.save(), client.save()]);
		res.status(200).send({
			message: 'OK',
			OK: true,
			data: { client: client, script: campaign.script[campaign.script.length - 1] }
		});
		log(`Get phone number success for ${caller.name} from: ` + ip, 'INFORMATION', 'getPhoneNumber.ts');
		return;
	}
}
