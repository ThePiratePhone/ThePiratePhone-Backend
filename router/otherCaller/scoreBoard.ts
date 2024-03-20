import { Request, Response } from 'express';
import { log } from '../../tools/log';
import clearPhone from '../../tools/clearPhone';
import phoneNumberCheck from '../../tools/phoneNumberCheck';
import { ObjectId } from 'mongodb';
import { Caller } from '../../Models/Caller';
import AreaCampaignProgress from '../../tools/areaCampaignProgress';
import { Area } from '../../Models/Area';
import { Campaign } from '../../Models/Campaign';

export default async function scoreBoard(req: Request<any>, res: Response<any>) {
	const ip = req.socket?.remoteAddress?.split(':').pop();

	if (
		!req.body ||
		typeof req.body.phone != 'string' ||
		typeof req.body.pinCode != 'string' ||
		!ObjectId.isValid(req.body.area) ||
		(req.body.CampaignId && !ObjectId.isValid(req.body.CampaignId))
	) {
		res.status(400).send({ message: 'Missing parameters', OK: false });
		log(`Missing parameters from: ` + ip, 'WARNING', 'scoreBoard.ts');
		return;
	}

	req.body.phone = clearPhone(req.body.phone);
	if (!phoneNumberCheck(req.body.phone)) {
		res.status(400).send({ message: 'Wrong phone number', OK: false });
		log(`Wrong phone number from: ` + ip, 'WARNING', 'scoreBoard.ts');
		return;
	}

	const caller = await Caller.findOne({ phone: req.body.phone, area: req.body.area, pinCode: req.body.pinCode });
	if (!caller) {
		res.status(404).send({ message: 'Caller not found', OK: false });
		log(`Caller not found from: ` + ip, 'WARNING', 'scoreBoard.ts');
		return;
	}

	const area = await Area.findOne({ _id: req.body.area });
	if (!area) {
		res.status(404).send({ message: 'area not found', OK: false });
		log(`Area not found from: ${caller.name} (${ip})`, 'WARNING', 'getPhoneNumber.ts');
		return;
	}

	let campaign;
	if (!req.body.campaign) campaign = (await AreaCampaignProgress(area)) as any;
	else campaign = Campaign.findOne({ _id: req.body.campaign, area: req.body.area });

	if (!campaign || campaign == null) {
		res.status(200).send({ message: 'no campaign in progress or campaign not found', OK: false });
		log(
			`No campaign in progress or campaign not found from: ${caller.name} (${ip})`,
			'WARNING',
			'getPhoneNumber.ts'
		);
		return;
	}

	if (campaign.area.toString() != area._id.toString() && !campaign.callerList.includes(caller._id)) {
		res.status(403).send({ message: 'You are not allowed to call this campaign', OK: false });
		log(`Caller not allowed to call this campaign from: ${caller.name} (${ip})`, 'WARNING', 'getPhoneNumber.ts');
		return;
	}

	const callers = await Caller.find({ area: req.body.area, _id: { $in: campaign.callerList } }).limit(10);

	const scoreBoard = callers.map(el => {
		return {
			name: el.name,
			nbCall: el.timeInCall.length,
			timeInCall: el.timeInCall.filter(el => el.campaign.toString() == campaign._id.toString())
		};
	});

	scoreBoard.sort((a, b) => {
		return b.nbCall - a.nbCall;
	});

	res.status(200).send({
		message: 'OK',
		data: scoreBoard,
		OK: true
	});
}
