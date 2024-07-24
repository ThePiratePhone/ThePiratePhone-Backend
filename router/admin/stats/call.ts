import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';

import { Area } from '../../../Models/Area';
import { Campaign } from '../../../Models/Campaign';
import { Client } from '../../../Models/Client';
import { log } from '../../../tools/log';
import { Call } from '../../../Models/Call';

export default async function call(req: Request<any>, res: Response<any>) {
	const ip = req.socket?.remoteAddress?.split(':').pop();

	if (
		!req.body ||
		(req.body.CampaignId && !ObjectId.isValid(req.body.CampaignId)) ||
		typeof req.body.adminCode != 'string' ||
		!ObjectId.isValid(req.body.area)
	) {
		res.status(400).send({ message: 'Missing parameters', OK: false });
		log('Missing parameters from ' + ip, 'WARNING', __filename);
		return;
	}

	const area = await Area.findOne({ _id: { $eq: req.body.area }, AdminPassword: { $eq: req.body.adminCode } });
	if (!area) {
		res.status(401).send({ message: 'Wrong Creantial', OK: false });
		log('Wrong Creantial from ' + ip, 'WARNING', __filename);
		return;
	}

	let campaign;
	if (!req.body.CampaignId) campaign = await Campaign.findOne({ area: area.id, active: true });
	else campaign = await Campaign.findOne({ _id: { $eq: req.body.CampaignId }, area: area.id });

	if (!campaign || campaign == null) {
		res.status(404).send({ message: 'no campaign in progress or campaign not found', OK: false });
		log(`No campaign in progress or campaign not found from: ${area.name} (${ip})`, 'WARNING', __filename);
		return;
	}

	let totalCalled = await Call.countDocuments({ campaign: campaign._id });
	let totalNotRespond = await Call.countDocuments({ campaign: campaign._id, status: 'notRespond' });
	let totalUser = await Client.countDocuments({ campaign: campaign._id });
	res.status(200).send({
		message: 'OK',
		OK: true,
		data: {
			totalCalled,
			totalNotRespond,
			totalUser
		}
	});

	log(`call stats get by ${area.name} (${ip})`, 'INFO', __filename);
}
