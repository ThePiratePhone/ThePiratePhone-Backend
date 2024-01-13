import { Request, Response } from 'express';
import { Campaign } from '../Models/campaign';
import { Log } from '../tools/log';

export default async function NewCampaigns(req: Request<any>, res: Response<any>) {
	if (!req.body || !req.body.name || !req.body.dateStart || !req.body.dateEnd || !req.body.script) {
		Log('Missing parameters from ' + req.socket?.remoteAddress?.split(':').pop(), 'WARNING', 'NewCampaigns.ts');
		res.status(400).send({ message: 'Missing parameters', OK: false });
		return;
	}

	const dateEnd = new Date(req.body.dateEnd);
	const dateStart = new Date(req.body.dateStart);
	if (
		typeof req.body.name !== 'string' ||
		isNaN(dateEnd.getTime()) ||
		typeof req.body.script != 'string' ||
		isNaN(dateStart.getTime())
	) {
		res.status(400).send({ message: 'Invalid parameters', OK: false });
		return;
	}

	if (await Campaign.exists({ name: req.body.name })) {
		res.status(400).send({ message: 'Campaign already exists', OK: false });
		return;
	}
	const campaign = new Campaign({
		name: req.body.name,
		dateStart: dateStart,
		dateEnd: dateEnd,
		script: new Array<String>().push(req.body.script)
	});

	campaign
		.save()
		.then(() => {
			Log('Campaign created by ' + req.socket?.remoteAddress?.split(':').pop(), 'INFORMATION', 'NewCampaigns.ts');
			res.status(201).send({ message: 'Campaign created', OK: true });
		})
		.catch(error => {
			Log('Error creating campaign: ' + error, 'ERROR', 'NewCampaigns.ts');
			res.status(400).send({ message: 'Error creating campaign', OK: false });
		});
}
