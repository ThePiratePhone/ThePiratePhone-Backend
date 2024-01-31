import { Campaign } from '../Models/Campaign';

async function AreaCampaignProgress(area): Promise<typeof Campaign | undefined> {
	if (!area || !area.id) {
		return undefined;
	}
	let campaign: any;
	if (!area.campaignInProgress) {
		campaign = await Campaign.findOne({
			dateStart: { $lte: new Date() },
			dateEnd: { $gte: new Date() }
		});
		if (!campaign) {
			return undefined;
		}
		area.campaignInProgress = campaign._id;
		await area.save();
	} else {
		campaign = await Campaign.findOne({ _id: area.campaignInProgress });
	}
	return campaign;
}

export default AreaCampaignProgress;
