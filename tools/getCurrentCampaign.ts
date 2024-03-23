import { ObjectId } from 'mongodb';
import { Area } from '../Models/Area';
import { Campaign } from '../Models/Campaign';

async function getCurrentCampaign(area: ObjectId): Promise<InstanceType<typeof Campaign> | null> {
	const CampaignArea = await Area.findOne({ _id: area });
	if (!CampaignArea) {
		return null;
	}
	let campaign: InstanceType<typeof Campaign> | null = null;
	if (!CampaignArea.campaignInProgress) {
		campaign = await Campaign.findOne({
			dateStart: { $lte: new Date() },
			dateEnd: { $gte: new Date() },
			area: CampaignArea._id
		});
		if (campaign) {
			CampaignArea.campaignInProgress = campaign._id;
			await CampaignArea.save();
		}
	} else {
		campaign = await Campaign.findOne({ _id: CampaignArea.campaignInProgress });
	}
	return campaign;
}
export default getCurrentCampaign;
