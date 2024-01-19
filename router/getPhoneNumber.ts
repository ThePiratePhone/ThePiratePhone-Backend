import { Request, Response } from 'express';
import checkCredential from '../tools/checkCreantial';
import { Area } from '../Models/area';
import { Campaign } from '../Models/Campaign';
import { Client } from '../Models/Client';
import { ObjectId } from 'mongodb';

export default async function GetPhoneNumber(req: Request<any>, res: Response<any>) {
	const ip = req.socket?.remoteAddress?.split(':').pop();
	if (
		!req.body ||
		typeof req.body.phone != 'string' ||
		typeof req.body.pinCode != 'string' ||
		typeof req.body.area != 'string'
	) {
		res.status(400).send({ message: 'Missing parameters', OK: false });
		return;
	}

	const caller = await checkCredential(req.body.phone, req.body.area, req.body.pinCode);
	if (!caller) {
		res.status(403).send({ message: 'Invalid credential', OK: false });
		return;
	}

	if (typeof caller.curentCall == typeof ObjectId) {
		res.status(400).send({ message: 'Already in a call', OK: false });
		return;
	}

	const area = await Area.findOne({ _id: req.body.area });
	if (!area) {
		res.status(500).send({ message: 'Internal error', OK: false });
		return;
	}

	if (!area.campaignInProgress) {
		res.status(400).send({ message: 'No campaign in progress', OK: false });
		return;
	}

	const campaign = await Campaign.findOne({ _id: area.campaignInProgress });
	if (!campaign) {
		res.status(500).send({ message: 'Internal error', OK: false });
		return;
	}

	if (campaign.dateStart.getTime() > Date.now() || campaign.dateEnd.getTime() < Date.now()) {
		res.status(400).send({ message: 'out of date', OK: false });
		return;
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
		return;
	} else {
		const clientCampaign = client.data.get(campaign._id.toString());
		if (!clientCampaign) {
			res.status(500).send({ message: 'Internal error', OK: false });
			return;
		}

		const last = clientCampaign.length - 1;
		caller.curentCall = client._id;
		clientCampaign[last].status = 'inprogress';
		clientCampaign[last].startCall = new Date();
		clientCampaign[last].caller = caller._id;
		clientCampaign[last].scriptVersion = campaign.script.length - 1;

		await Promise.all([caller.save(), client.save()]);
		res.status(200).send({ message: 'OK', OK: true, data: client });
		return;
	}
}
