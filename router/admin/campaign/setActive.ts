import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import { log } from '../../../tools/log';
import { Area } from '../../../Models/Area';
import { Campaign } from '../../../Models/Campaign';
import getCurrentCampaign from '../../../tools/getCurrentCampaign';

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

	const previusCampaign = await getCurrentCampaign(area._id);

	if (req.body.active) {
		const campaign = await Campaign.updateOne({ _id: req.body.campaign, area: area._id }, { active: true });
		if (campaign.matchedCount == 0) {
			log(`Campaign not found from ${ip}`, 'WARNING', 'createClient.ts');
			res.status(404).send({ message: 'Campaign not found', OK: false });
			return;
		}
		area.campaignInProgress = req.body.campaign;
		await area.save();
		if (previusCampaign && previusCampaign._id != req.body.campaign) {
			await Campaign.updateOne({ _id: previusCampaign._id }, { active: false });
		}
		res.send({ message: 'Campaign activated', OK: true });
	} else {
		if (previusCampaign) {
			previusCampaign.active = false;
		}
		area.campaignInProgress = null;
		if (previusCampaign) {
			await Promise.all([previusCampaign.save(), area.save()]);
		} else {
			await area.save();
		}
		res.send({ message: 'Campaign deactivated', OK: true });
	}
}
