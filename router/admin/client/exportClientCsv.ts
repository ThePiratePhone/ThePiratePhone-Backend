import { format } from '@fast-csv/format';
import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';

import { Area } from '../../../Models/Area';
import { Caller } from '../../../Models/Caller';
import { Campaign } from '../../../Models/Campaign';
import { Client } from '../../../Models/Client';
import getCurrentCampaign from '../../../tools/getCurrentCampaign';
import { log } from '../../../tools/log';
import { cleanSatisfaction, CleanStatus } from '../../../tools/utils';

export default async function exportClientCsv(req: Request<any>, res: Response<any>) {
	const ip = req.socket?.remoteAddress?.split(':').pop();
	if (
		!req.body ||
		typeof req.body.adminCode != 'string' ||
		!ObjectId.isValid(req.body.area) ||
		(req.body.CampaignId && !ObjectId.isValid(req.body.CampaignId))
	) {
		res.status(400).send({ message: 'Missing parameters', OK: false });
		log(`Missing parameters from ` + ip, 'WARNING', 'exportClientCsv.ts');
		return;
	}

	const area = await Area.findOne({ AdminPassword: req.body.adminCode, _id: req.body.area });
	if (!area) {
		res.status(401).send({ message: 'Wrong admin code', OK: false });
		log(`Wrong admin code from ${ip}`, 'WARNING', 'exportClientCsv.ts');
		return;
	}
	let selector = { area: area._id };

	let campaign: InstanceType<typeof Campaign> | null = null;

	if (req.body.CampaignId) {
		campaign = await Campaign.findOne({ _id: req.body.CampaignId, Area: area._id });
	} else {
		campaign = await getCurrentCampaign(area._id);
	}
	if (!campaign) {
		res.status(401).send({ message: 'Wrong campaign id', OK: false });
		log(`Wrong campaign id from ${area.name} (${ip})`, 'WARNING', 'changeCallHours.ts');
		return;
	}

	selector = { area: area._id, [`data.${campaign._id}`]: { $exists: true, $not: { $size: 0 } } };

	res.setHeader('Content-Disposition', 'attachment; filename=export.csv');
	res.setHeader('Content-Type', 'text/csv');

	const csvStream = format({ headers: true, delimiter: ';' });
	csvStream.pipe(res);

	const numberOfClients = await Client.countDocuments(selector);
	const clients = Client.find(selector).cursor();
	await clients.eachAsync(async client => {
		const csvData: {
			statut?: 'Appelé·e' | 'Non appelé·e' | 'Appel en cours' | 'Aucune réponse' | 'Aucune info';
			satisfaction?:
				| 'A retirer'
				| 'Pas interessé·e'
				| 'Pas de réponse'
				| 'Pas voté pour nous'
				| 'Voté pour nous'
				| 'Une erreur est survenue. Contactez les développeurs';
			appeleant?: string;
			commentaire?: string;
		} = {};
		const lastCall = client.data.get(campaign?._id?.toString() ?? '')?.find(cl => cl.status == 'called');
		if (lastCall) {
			csvData.statut = CleanStatus(lastCall?.status);
			csvData.satisfaction = cleanSatisfaction(lastCall?.satisfaction ?? null);
			csvData.appeleant = lastCall?.caller
				? (await Caller.findOne(lastCall.caller, ['name']))?.name ?? 'Inconnu·e'
				: '';
			csvData.commentaire = lastCall?.comment ?? '';
		}

		csvStream.write({
			nom: client.name,
			telephone: client.phone,
			institution: client.institution,
			promotion: client.promotion,
			statut: csvData.statut ?? '',
			satisfaction: csvData.satisfaction ?? '',
			appeleant: csvData.appeleant ?? '',
			commentaire: csvData.commentaire ?? ''
		});
	});
	csvStream.end();
	res.end();
	log(`Exported ${numberOfClients} clients from ${ip} (${area.name})`, 'INFORMATION', 'exportClientCsv.ts');
}
