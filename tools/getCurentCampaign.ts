import { ObjectId } from 'mongodb';
import { Campaign } from '../Models/Campaign';
import { Area } from '../Models/area';
async function getCurentCampaign(area: ObjectId): Promise<typeof Campaign | null> {
	const CampaignArea = await Area.findOne({ _id: area });
	if (!CampaignArea) {
		return null;
	}
	let campaign: any;
	if (!CampaignArea.campaignInProgress) {
		campaign = await Campaign.findOne({
			dateStart: { $lte: new Date() },
			dateEnd: { $gte: new Date() },
			area: CampaignArea._id
		});
		if (!campaign) {
			return null;
		}
		CampaignArea.campaignInProgress = campaign._id;
		await CampaignArea.save();
	} else {
		campaign = await Campaign.findOne({ _id: CampaignArea.campaignInProgress });
	}
	return campaign;
}
export default getCurentCampaign;
