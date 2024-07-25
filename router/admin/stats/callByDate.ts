import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';

import { Area } from '../../../Models/Area';
import { Call } from '../../../Models/Call';
import { Campaign } from '../../../Models/Campaign';
import { log } from '../../../tools/log';

export default async function callByDate(req: Request<any>, res: Response<any>) {
	const ip = req.socket?.remoteAddress?.split(':').pop();
	if (
		!req.body ||
		typeof req.body.adminCode != 'string' ||
		!ObjectId.isValid(req.body.area) ||
		(req.body.CampaignId && !ObjectId.isValid(req.body.CampaignId))
	) {
		res.status(400).send({ message: 'Missing parameters', OK: false });
		log('Missing parameters from ' + ip, 'WARNING', __filename);
		return;
	}

	const area = await Area.findOne({ adminPassword: { $eq: req.body.adminCode }, _id: { $eq: req.body.area } }, [
		'name'
	]);
	if (!area) {
		res.status(401).send({ message: 'Wrong admin code', OK: false });
		log(`Wrong admin code from ${ip}`, 'WARNING', __filename);
		return;
	}
	let campaign: InstanceType<typeof Campaign> | null = null;

	if (req.body.CampaignId) {
		campaign = await Campaign.findOne({ _id: { $eq: req.body.CampaignId }, area: area._id }, []);
	} else {
		campaign = await Campaign.findOne({ area: area._id, active: true }, []);
	}
	if (!campaign) {
		res.status(401).send({ message: 'Wrong campaign id', OK: false });
		log(`Wrong campaign id from ${area.name} (${ip})`, 'WARNING', __filename);
		return;
	}
	res.setHeader('Content-Type', 'application/json');
	res.setHeader('Transfer-Encoding', 'chunked');
	res.write('{ "data": [');

	const NbCall = await Call.countDocuments({ campaign: campaign._id });
	let i = 0;
	await Call.find({ campaign: campaign._id })
		.cursor()
		.eachAsync(call => {
			res.write(
				JSON.stringify({
					date: call.start ?? 0,
					response: call.status,
					satisfaction: call.satisfaction
				}) + (NbCall - 1 == i ? '' : ',')
			);
			i++;
		});
	res.write(']}');
	res.end();
	log(`get call by date from ${ip} (${area.name})`, 'INFO', __filename);
}
