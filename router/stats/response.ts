import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import { log } from '../../tools/log';
import { Client } from '../../Models/Client';
import { Area } from '../../Models/Area';
import getCurrentCampaign from '../../tools/getCurrentCampaign';

export default async function response(req: Request<any>, res: Response<any>) {
	const ip = req.socket?.remoteAddress?.split(':').pop();

	if (
		!req.body ||
		!ObjectId.isValid(req.body.campaign) ||
		typeof req.body.adminCode != 'string' ||
		!ObjectId.isValid(req.body.area)
	) {
		res.status(400).send({ message: 'Missing parameters', OK: false });
		log('Missing parameters from ' + ip, 'WARNING', 'response.ts');
		return;
	}

	const area = await Area.findOne({ _id: req.body.area, AdminPassword: req.body.adminCode });
	if (!area) {
		res.status(401).send({ message: 'Wrong Creantial', OK: false });
		log('Wrong Creantial from ' + ip, 'WARNING', 'response.ts');
		return;
	}

	const campaign = (await getCurrentCampaign(area._id)) as any;
	if (!campaign) {
		res.status(404).send({ message: 'campaign not found', OK: false });
		log(`Campaign not found from: ${area.name} (${ip})`, 'WARNING', 'response.ts');
		return;
	}

	const clientInThisCampaign = Client.find({
		[`data.${campaign._id}`]: { $exists: true, $not: { $size: 0 } }
	}).cursor();

	let clientCalled = 0;
	let converted = 0;
	let failure = 0;
	let notInterested = 0;
	let removed = 0;
	let notAnswered = 0;
	await clientInThisCampaign.eachAsync(client => {
		const data = client.data.get(campaign._id);
		const call = data?.[data.length - 1];

		clientCalled++;
		if (call && call.status) {
			switch (call.status) {
				case 'inprogress':
					break;
				case 'not answered':
					notAnswered++;
					break;
				case 'called':
					switch (call.satisfaction) {
						case -2:
							removed++;
							break;
						case -1:
							notInterested++;
							break;
						case 0:
							notAnswered++;
							break;
						case 1:
							failure++;
							break;
						case 2:
							converted++;
							break;
						default:
							break;
					}
					break;
				default:
					break;
			}
		}
	});

	res.status(200).send({
		message: 'OK',
		OK: true,
		data: {
			clientCalled: clientCalled,
			converted: converted,
			failure: failure,
			notInterested: notInterested,
			removed: removed,
			notAnswered: notAnswered
		}
	});

	log(`response stats get by ${area.name} (${ip})`, 'INFORMATION', 'response.ts');
}
