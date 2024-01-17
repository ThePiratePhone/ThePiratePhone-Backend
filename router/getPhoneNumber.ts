import { Request, Response } from 'express';
import checkCredential from '../tools/checkCreantial';
import { Area } from '../Models/area';
import { Campaign } from '../Models/Campaign';
import { Client } from '../Models/Client';

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

	const caller = checkCredential(req.body.phone, req.body.area, req.body.pinCode);
	if (!caller) {
		res.status(403).send({ message: 'Invalid credential', OK: false });
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
	const client = await Client.findOne({
		_id: { $in: area.ClientList },
		data: { $elemMatch: { status: 'not called' } }
	});
	if (!client) {
		res.status(400).send({ message: 'No client available', OK: false });
		return;
	} else {
		caller;
		res.status(200).send({ message: 'OK', OK: true, data: client });
		return;
	}
}
