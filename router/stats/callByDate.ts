import { json, Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import { log } from '../../tools/log';
import { Campaign } from '../../Models/Campaign';
import getCurrentCampaign from '../../tools/getCurrentCampaign';
import { Area } from '../../Models/Area';
import { Client } from '../../Models/Client';

export default async function callByDate(req: Request<any>, res: Response<any>) {
	const ip = req.socket?.remoteAddress?.split(':').pop();
	if (
		!req.body ||
		typeof req.body.adminCode != 'string' ||
		!ObjectId.isValid(req.body.area) ||
		(req.body.CampaignId && !ObjectId.isValid(req.body.CampaignId))
	) {
		res.status(400).send({ message: 'Missing parameters', OK: false });
		log('Missing parameters from ' + ip, 'WARNING', 'callByDate.ts');
		return;
	}

	const area = await Area.findOne({ AdminPassword: req.body.adminCode, _id: req.body.area }, ['name']);
	if (!area) {
		res.status(401).send({ message: 'Wrong admin code', OK: false });
		log(`Wrong admin code from ${ip}`, 'WARNING', 'callByDate.ts');
		return;
	}
	let campaign: InstanceType<typeof Campaign> | null = null;

	if (req.body.CampaignId) {
		campaign = await Campaign.findOne({ _id: req.body.CampaignId, Area: area._id }, []);
	} else {
		campaign = await getCurrentCampaign(area._id);
	}
	if (!campaign) {
		res.status(401).send({ message: 'Wrong campaign id', OK: false });
		log(`Wrong campaign id from ${area.name} (${ip})`, 'WARNING', 'callByDate.ts');
		return;
	}
	res.setHeader('Content-Type', 'application/json');
	res.setHeader('Transfer-Encoding', 'chunked');
	res.write('{ "data": [');

	const selector = { area: area._id, [`data.${campaign?._id ?? ''}`]: { $exists: true, $not: { $size: 0 } } };
	const numberClient = await Client.countDocuments(selector);
	let i = 0;
	await Client.find(selector)
		.cursor()
		.eachAsync(client => {
			const data = client.data.get((campaign?._id ?? '').toString());
			data?.forEach(el => {
				res.write(
					JSON.stringify({
						date: el.startCall ?? 0,
						response: el.status == 'not answered' || el.status == 'not called' ? false : true
					}) + (numberClient - 1 == i ? '' : ',')
				);
			});
			i++;
		});
	res.write(']}');
	res.end();
	log(`get call by date from ${ip} (${area.name})`, 'INFORMATION', 'callByDate.ts');
}
