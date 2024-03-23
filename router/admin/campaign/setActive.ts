import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import { log } from '../../../tools/log';
import { Area } from '../../../Models/Area';
import { Campaign } from '../../../Models/Campaign';

export default async function setActive(req: Request<any>, res: Response<any>) {
	const ip = req.socket?.remoteAddress?.split(':').pop();
	if (
		!req.body ||
		typeof req.body.adminCode != 'string' ||
		typeof req.body.active != 'boolean' ||
		(req.body.active && !ObjectId.isValid(req.body.campaign)) ||
		!ObjectId.isValid(req.body.area)
	) {
		log(`Missing parameters from ` + ip, 'WARNING', 'createClient.ts');
		res.status(400).send({ message: 'Missing parameters', OK: false });
		return;
	}

	const area = await Area.findOne({ AdminPassword: req.body.adminCode, _id: req.body.area });
	if (!area) {
		log(`Wrong admin code from ${ip}`, 'WARNING', 'createClient.ts');
		res.status(401).send({ message: 'Wrong admin code', OK: false });
		return;
	}

	const campaign = await Campaign.findOne({ _id: req.body.campaign, areaId: area._id });
	if (!campaign) {
		log(`Campaign not found from ${ip}`, 'WARNING', 'createClient.ts');
		res.status(400).send({ message: 'Campaign not found', OK: false });
		return;
	}
	let areaUpdate, update;
	if (!req.body.active) {
		update = await Campaign.updateOne({ _id: campaign._id }, { active: false });
		areaUpdate = await Area.updateOne({ _id: area._id }, { activeCampaign: null });
		return;
	} else {
		update = await Campaign.updateOne({ _id: campaign._id }, { active: true });
		areaUpdate = await Area.updateOne({ _id: area._id }, { activeCampaign: campaign._id });
	}

	if (update && areaUpdate) {
		log(
			`Campaign ${campaign.name} is now ${req.body.active ? 'active' : 'inactive'} from ${ip}`,
			'INFORMATION',
			'createClient.ts'
		);
		res.status(200).send({ message: 'Campaign updated', OK: true });
	} else {
		log(`Error updating campaign ${campaign.name} from ${ip}`, 'ERROR', 'createClient.ts');
		res.status(500).send({ message: 'Error updating campaign', OK: false });
	}
}
