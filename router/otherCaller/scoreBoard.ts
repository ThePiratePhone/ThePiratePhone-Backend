import { Request, Response } from 'express';
import { log } from '../../tools/log';
import clearPhone from '../../tools/clearPhone';
import phoneNumberCheck from '../../tools/phoneNumberCheck';
import { ObjectId } from 'mongodb';
import { Caller } from '../../Models/Caller';
import { Area } from '../../Models/Area';
import { Campaign } from '../../Models/Campaign';
import getCurrentCampaign from '../../tools/getCurrentCampaign';

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
		log(`Area not found from: ${caller.name} (${ip})`, 'WARNING', 'scoreBoard.ts');
		return;
	}

	let campaign;
	if (!req.body.campaign) campaign = await getCurrentCampaign(area._id);
	else campaign = Campaign.findOne({ _id: req.body.campaign, area: req.body.area });

	if (!campaign || campaign == null) {
		res.status(200).send({ message: 'no campaign in progress or campaign not found', OK: false });
		log(`No campaign in progress or campaign not found from: ${caller.name} (${ip})`, 'WARNING', 'scoreBoard.ts');
		return;
	}

	if (campaign.area.toString() != area._id.toString() && !caller.campaigns.includes(campaign._id)) {
		res.status(403).send({ message: 'You are not allowed to call this campaign', OK: false });
		log(`Caller not allowed to call this campaign from: ${caller.name} (${ip})`, 'WARNING', 'scoreBoard.ts');
		return;
	}

	const callers = await Caller.aggregate([
		{ $match: { area: ObjectId.createFromHexString(req.body.area), campaigns: campaign._id } },
		{ $addFields: { length: { $size: '$timeInCall' } } },
		{ $sort: { length: -1 } },
		{ $limit: 5 }
	]);

	let place: any = callers.findIndex(el => el.phone == req.body.phone);
	if (place >= -1) {
		const truc = await Caller.aggregate([
			{ $match: { area: ObjectId.createFromHexString(req.body.area), campaigns: campaign._id } },
			{ $addFields: { length: { $size: '$timeInCall' } } },
			{ $sort: { length: -1 } },
			{ $project: { name: 1, timeInCall: 1, phone: 1 } },
			{
				$group: {
					_id: null,
					phones: { $push: '$phone' },
					names: { $push: '$name' },
					timeInCalls: { $push: '$timeInCall' }
				}
			},
			{ $project: { yourPlace: { $indexOfArray: ['$phones', req.body.phone] }, names: 1, timeInCalls: 1 } },
			{ $unwind: { path: '$yourPlace' } },
			{
				$project: {
					name: { $arrayElemAt: ['$names', '$yourPlace'] },
					timeInCall: { $arrayElemAt: ['$timeInCalls', '$yourPlace'] },
					yourPlace: '$yourPlace'
				}
			}
		]);

		console.log(truc);
		place = truc[0].yourPlace;
	}

	const scoreBoard = callers.map(el => {
		return {
			name: el.name,
			nbCall: el.timeInCall.length,
			timeInCall: el.timeInCall.reduce((acc, cur) => acc + cur.time, 0)
		};
	});

	scoreBoard.sort((a, b) => {
		return b.nbCall - a.nbCall;
	});
	res.status(200).send({
		message: 'OK',
		data: { scoreBoard, yourPlace: place + 1 },
		OK: true
	});
	log(`Scoreboard sent to ${caller.name} (${ip})`, 'INFORMATION', 'scoreBoard.ts');
}
