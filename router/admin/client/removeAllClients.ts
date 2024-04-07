import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import { log } from '../../../tools/log';
import { Area } from '../../../Models/Area';
import { Client } from '../../../Models/Client';
import { Campaign } from '../../../Models/Campaign';
import getCurrentCampaign from '../../../tools/getCurrentCampaign';

export default async function removeAllClients(req: Request<any>, res: Response<any>) {
	const ip = req.socket?.remoteAddress?.split(':').pop();
	if (
		!req.body ||
		typeof req.body.adminCode != 'string' ||
		!ObjectId.isValid(req.body.area) ||
		(req.body.CampaignId && !ObjectId.isValid(req.body.CampaignId))
	) {
		res.status(400).send({ message: 'Missing parameters', OK: false });
		log(`Missing parameters from ` + ip, 'WARNING', 'removeAllClients.ts');
		return;
	}

	const area = await Area.findOne({ AdminPassword: req.body.adminCode, _id: req.body.area });
	if (!area) {
		res.status(401).send({ message: 'Wrong admin code', OK: false });
		log(`Wrong admin code from ${ip}`, 'WARNING', 'removeAllClients.ts');
		return;
	}

	let campaign: InstanceType<typeof Campaign> | null = null;

	if (req.body.CampaignId) {
		campaign = await Campaign.findOne({ _id: req.body.CampaignId, Area: area._id });
	} else {
		campaign = await getCurrentCampaign(area._id);
	}
	if (!campaign) {
		res.status(401).send({ message: 'Wrong campaign id', OK: false });
		log(`Wrong campaign id from ${area.name} (${ip})`, 'WARNING', 'removeAllClients.ts');
		return;
	}

	const client = (await Client.find({
		['data.' + campaign._id]: { $ne: [] },
		area: area._id
	})) as unknown as InstanceType<typeof Client>[];

	if (client.length) {
		await Promise.all(
			client.map(async el => {
				el.data.delete(campaign?._id?.toString() ?? '');
				if (el.data.size == 0) {
					await Client.deleteOne(el._id);
				} else {
					await el.save();
				}
			})
		);
	}
	res.status(200).send({ message: 'OK', OK: true });
	log(`Clients removed from ${ip} (${area.name})`, 'INFORMATION', 'removeAllClients.ts');
}
