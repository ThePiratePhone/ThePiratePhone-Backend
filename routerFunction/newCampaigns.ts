import { Request, Response } from 'express';
import { Campaign } from '../Models/campaign';
import { Log } from '../tools/log';

export default function NewCampaigns(req: Request<any>, res: Response<any>) {
	console.log(req.body);
	if (!req.body || !req.body.name || !req.body.dateEnd) {
		Log('Missing parameters from ' + req.socket?.remoteAddress?.split(':').pop(), 'WARNING', 'NewCampaigns.ts');
		res.status(400).send('Missing parameters');
		return;
	}

	const dateEnd = new Date(req.body.dateEnd);
	if (typeof req.body.name !== 'string' || req.body.name == '' || isNaN(dateEnd.getTime())) {
		res.status(400).send('Invalid parameters');
		return;
	}
	const campaign = new Campaign({
		name: req.body.name,
		dateStart: req.body.dateStart,
		dateEnd: req.body.dateEnd
	});
	campaign
		.save()
		.then(() => {
			Log('Campaign created by ' + req.socket?.remoteAddress?.split(':').pop(), 'INFORMATION', 'NewCampaigns.ts');
			res.status(200).send('Campaign created');
		})
		.catch(error => {
			Log('Error creating campaign: ' + error, 'ERROR', 'NewCampaigns.ts');
			res.status(500).send('Error creating campaign');
		});
}
