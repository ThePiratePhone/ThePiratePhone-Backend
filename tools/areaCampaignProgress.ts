import { ObjectId } from 'mongodb';
import { Campaign } from '../Models/Campaign';
import { Client } from '../Models/Client';
import { Area } from '../Models/area';
async function AreaCampaignProgress(area: ObjectId): Promise<[number, number]> {
	const CampaignArea = await Area.findOne({ _id: area });
	if (!CampaignArea) {
		return [0, 0];
	}
	let campaign: any;
	if (!CampaignArea.campaignInProgress) {
		campaign = await Campaign.findOne({
			dateStart: { $lte: new Date() },
			dateEnd: { $gte: new Date() }
		});
		if (!campaign) {
			return [0, 0];
		}
		CampaignArea.campaignInProgress = campaign._id;
		await CampaignArea.save();
	} else {
		campaign = await Campaign.findOne({ _id: CampaignArea.campaignInProgress });
	}

	const count = await Client.countDocuments({
		area: { $in: CampaignArea.ClientList },
		data: { $elemMatch: { status: 'called' } }
	});

	return [count, campaign.userList.length];
}
export default AreaCampaignProgress;
