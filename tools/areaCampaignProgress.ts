import { Campaign } from '../Models/Campaign';

async function AreaCampaignProgress(area): Promise<typeof Campaign | undefined> {
	if (!area || !area.id) {
		return undefined;
	}
	let campaign: any;
	if (!area.campaignInProgress) {
		campaign = await Campaign.findOne({
			dateStart: { $lte: new Date() },
			dateEnd: { $gte: new Date() },
			area: area.id
		});
		if (!campaign) {
			return undefined;
		}
		area.campaignInProgress = campaign._id;
		await area.save();
	} else {
		campaign = await Campaign.findOne({ _id: area.campaignInProgress });
		if (!campaign) {
			area.campaignInProgress = null;
			await area.save();
			return await AreaCampaignProgress(area);
		}
		if (campaign.dateEnd < new Date() || campaign.dateStart > new Date()) {
			area.campaignInProgress = null;
			await area.save();
			return await AreaCampaignProgress(area);
		}
	}
	return campaign;
}

export default AreaCampaignProgress;
