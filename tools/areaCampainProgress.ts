import { ObjectId } from 'mongodb';
import { Campaign } from '../Models/Campaign';
import { Client } from '../Models/Client';
import { Area } from '../Models/area';
async function AreaCampaingProgress(area: ObjectId): Promise<[number, number]> {
	const campaingArea = await Area.findOne({ _id: area });
	if (!campaingArea) {
		return [0, 0];
	}
	let campaign: any;
	if (!campaingArea.campaignInProgress) {
		campaign = await Campaign.findOne({
			dateStart: { $lte: new Date() },
			dateEnd: { $gte: new Date() }
		});
		if (!campaign) {
			return [0, 0];
		}
		campaingArea.campaignInProgress = campaign._id;
		await campaingArea.save();
	} else {
		campaign = await Campaign.findOne({ _id: campaingArea.campaignInProgress });
	}

	const count = await Client.countDocuments({
		area: { $in: campaingArea.ClientList },
		data: { $elemMatch: { status: 'called' } }
	});

	return [count, campaign.userList.length];
}
export default AreaCampaingProgress;
