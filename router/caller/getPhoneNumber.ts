import { Request, Response } from 'express';

import { Client } from '../../Models/Client';
import { Area } from '../../Models/area';
import AreaCampaignProgress from '../../tools/areaCampaignProgress';
import checkCredentials from '../../tools/checkCredentials';
import { log } from '../../tools/log';
import { ObjectId } from 'mongodb';
import { Campaign } from '../../Models/Campaign';

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
		log(`Invalid credential from:  ${req.body.phone} (${ip})`, 'WARNING', 'getPhoneNumber.ts');
		return;
	}

	const area = await Area.findOne({ _id: req.body.area });
	if (!area) {
		res.status(404).send({ message: 'area not found', OK: false });
		log(`Area not found from: ${caller.name} (${ip})`, 'WARNING', 'getPhoneNumber.ts');
		return;
	}

	const campaign = (await AreaCampaignProgress(area)) as any;

	if (!campaign || campaign == null) {
		res.status(200).send({ message: 'no campaign in progress', OK: false });
		log(`No campaign in progress from: ${caller.name} (${ip})`, 'WARNING', 'getPhoneNumber.ts');
		return;
	}

	if (campaign.area.toString() != area._id.toString() && !campaign.callerList.includes(caller._id)) {
		res.status(403).send({ message: 'You are not allowed to call this campaign', OK: false });
		log(`Caller not allowed to call this campaign from: ${caller.name} (${ip})`, 'WARNING', 'getPhoneNumber.ts');
		return;
	}

	if (typeof caller.curentCall == 'object') {
		const client = await Client.findOne({ _id: caller.curentCall?.client });
		if (!client) {
			caller.curentCall = null;
		} else {
			//if client is in the same campaign
			if (caller.curentCall?.campaign?.toString() == campaign._id.toString()) {
				res.status(400).send({
					message: 'Already in a call',
					OK: true,
					client: client,
					script: campaign.script[campaign.script.length - 1]
				});
				log(`Already in a call from: ${caller.name} (${ip})`, 'WARNING', 'getPhoneNumber.ts');
				return;
			} else {
				//if client is in another campaign
				const callCampaign = await Campaign.findOne({ _id: caller.curentCall?.campaign });
				if (!callCampaign) {
					caller.curentCall = null;
				} else {
					res.status(400).send({
						message: 'Already in a call',
						OK: true,
						client: client,
						script: callCampaign.script[callCampaign.script.length - 1]
					});
					log(`Already in a call from: ${caller.name} (${ip})`, 'WARNING', 'getPhoneNumber.ts');
					return;
				}
			}
		}
	}

	//find first client with status not called
	const threeHoursAgo = new Date();
	threeHoursAgo.setHours(threeHoursAgo.getHours() - 3);
	let client: any;
	try {
		client = await Client.aggregate([
			{
				$match: {
					['data.' + campaign._id]: { $exists: true, $ne: [] }
				}
			},
			{
				$addFields: {
					lastElement: { $arrayElemAt: ['$data.' + campaign._id, -1] },
					dataSize: { $size: '$data.' + campaign._id }
				}
			},
			{
				$match: {
					$or: [
						{
							'lastElement.status': 'not answered',
							'lastElement.endCall': { $lte: new Date(Date.now() - campaign.timeBetweenCall) }
						},
						{ 'lastElement.status': 'not called' }
					],
					dataSize: { $lte: campaign.nbMaxCallCampaign }
				}
			},
			{ $unset: 'lastElement' },
			{ $unset: 'dataSize' },
			{ $limit: 1 }
		]);
	} catch (e) {
		res.status(500).send({ message: 'Internal error', OK: false });
		log(`Error while getting client`, 'ERROR', 'getPhoneNumber.ts');
	}

	if (!client || client.length == 0) {
		res.status(400).send({ message: 'No client available', OK: false });
		log(`No client available from: ` + ip, 'WARNING', 'getPhoneNumber.ts');
		return;
	} else {
		const clientCampaign = client[0].data[campaign._id];
		if (!clientCampaign) {
			res.status(500).send({ message: 'Internal error', OK: false });
			log(`Error while getting client campaign`, 'WARNING', 'getPhoneNumber.ts');
			return;
		}

		caller.curentCall = { client: client[0]._id, campaign: campaign._id };
		if (clientCampaign.length <= 1 && clientCampaign[0].status == 'not called') {
			const last = clientCampaign.length - 1;
			clientCampaign[last].status = 'inprogress';
			clientCampaign[last].caller = caller._id;
			clientCampaign[last].scriptVersion = campaign.script.length - 1;
		} else {
			clientCampaign.push({
				status: 'inprogress',
				caller: caller._id,
				scriptVersion: campaign.script.length - 1,
				startCall: new Date()
			});
		}
		await Promise.all([caller.save(), Client.updateOne({ _id: client[0]._id }, { data: client[0].data })]);
		res.status(200).send({
			message: 'OK',
			OK: true,
			data: { client: client[0], script: campaign.script[campaign.script.length - 1] }
		});
		log(`Get phone number success for ${caller.name} (${ip})`, 'INFORMATION', 'getPhoneNumber.ts');
		return;
	}
}
