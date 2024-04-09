import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';

import { Area } from '../../Models/Area';
import { Caller } from '../../Models/Caller';
import { Campaign } from '../../Models/Campaign';
import clearPhone from '../../tools/clearPhone';
import getCurrentCampaign from '../../tools/getCurrentCampaign';
import { log } from '../../tools/log';
import phoneNumberCheck from '../../tools/phoneNumberCheck';
import mongoose from 'mongoose';

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

	const caller = await Caller.findOne({ phone: req.body.phone, pinCode: req.body.pinCode });
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
	if (!req.body.campaign) campaign = await getCurrentCampaign(area.id);
	else campaign = Campaign.findOne({ _id: req.body.campaign, area: req.body.area });

	if (!campaign || campaign == null) {
		res.status(404).send({ message: 'no campaign in progress or campaign not found', OK: false });
		log(`No campaign in progress or campaign not found from: ${caller.name} (${ip})`, 'WARNING', 'scoreBoard.ts');
		return;
	}

	if (campaign.area.toString() != area._id.toString() && !caller.campaigns.includes(campaign._id)) {
		res.status(403).send({ message: 'You are not allowed to call this campaign', OK: false });
		log(`Caller not allowed to call this campaign from: ${caller.name} (${ip})`, 'WARNING', 'scoreBoard.ts');
		return;
	}

	let callers = await Caller.aggregate([
		{
			$project: {
				name: 1,
				phone: 2,
				totalCalls: {
					$size: {
						$filter: {
							input: '$timeInCall',
							as: 'call',
							cond: { $eq: ['$$call.campaign', campaign._id] }
						}
					}
				},
				totalTime: {
					$sum: {
						$map: {
							input: {
								$filter: {
									input: '$timeInCall',
									as: 'call',
									cond: { $eq: ['$$call.campaign', campaign._id] }
								}
							},
							as: 'call',
							in: '$$call.time'
						}
					}
				}
			}
		},
		{
			$sort: { totalCalls: -1 }
		},
		{
			$limit: 5
		}
	]);

	callers.sort((a, b) => {
		return b.totalCalls - a.totalCalls;
	});

	callers = callers.filter(el => el.totalCalls > 0);
	let place = callers.findIndex(el => el.phone == req.body.phone);

	if (place == -1) {
		await Caller.aggregate([
			{
				$project: {
					name: 1,
					phone: 2,
					totalCalls: {
						$size: {
							$filter: {
								input: '$timeInCall',
								as: 'call',
								cond: { $eq: ['$$call.campaign', campaign._id] }
							}
						}
					},
					totalTime: {
						$sum: {
							$map: {
								input: {
									$filter: {
										input: '$timeInCall',
										as: 'call',
										cond: { $eq: ['$$call.campaign', campaign._id] }
									}
								},
								as: 'call',
								in: '$$call.time'
							}
						}
					}
				}
			},
			{
				$sort: { totalCalls: -1 }
			}
		])
			.cursor()
			.eachAsync((caller, index) => {
				if (caller.phone === req.body.phone) {
					place = index + 1;
					callers.push({
						name: caller.name,
						totalCalls: caller.totalCalls,
						totalTime: caller.totalTime
					});
				}
			});
	}

	callers.sort((a, b) => {
		return b.nbCall - a.nbCall;
	});

	res.status(200).send({
		message: 'OK',
		data: { scoreBoard: callers, yourPlace: place },
		OK: true
	});
	log(`Scoreboard sent to ${caller.name} (${ip})`, 'INFORMATION', 'scoreBoard.ts');
}
