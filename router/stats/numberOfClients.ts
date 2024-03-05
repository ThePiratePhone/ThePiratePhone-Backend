import { Request, Response } from 'express';

import { Area } from '../../Models/Area';
import { Campaign } from '../../Models/Campaign';
import { Client } from '../../Models/Client';
import { log } from '../../tools/log';
import { ObjectId } from 'mongodb';

export default async function numberOfClients(req: Request<any>, res: Response<any>) {
	const ip = req.socket?.remoteAddress?.split(':').pop();
	if (
		!req.body ||
		!ObjectId.isValid(req.body.campaign) ||
		typeof req.body.adminCode != 'string' ||
		!ObjectId.isValid(req.body.area)
	) {
		res.status(400).send({ message: 'Missing parameters', OK: false });
		log('Missing parameters', 'WARNING', 'numberOfClients.ts');
		return;
	}

	const area = await Area.findOne({ _id: req.body.area, AdminPassword: req.body.adminCode });
	if (!area) {
		res.status(401).send({ message: 'Wrong admin code', OK: false });
		log('Wrong admin code from ' + ip, 'WARNING', 'numberOfClients.ts');
		return;
	}

	const campaign = await Campaign.findOne({ _id: req.body.campaign });
	if (!campaign) {
		res.status(401).send({ message: 'Wrong campaign id', OK: false });
		log('Wrong campaign id from ' + ip, 'WARNING', 'numberOfClients.ts');
		return;
	}

	const totalClient = await Client.countDocuments({ data: { $elemMatch: { $eq: campaign._id.toString() } } });

	res.status(200).send({
		message: 'in this campaign ' + totalClient + ' client was added',
		OK: true,
		data: { numberOfClient: totalClient }
	});
	log(`number of client get by ${area.name} (${ip})`, 'INFORMATION', 'numberOfClients.ts');
}
