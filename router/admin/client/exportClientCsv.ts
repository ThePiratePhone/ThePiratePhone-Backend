import { format } from '@fast-csv/format';
import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';

import { Area } from '../../../Models/Area';
import { Call } from '../../../Models/Call';
import { Caller } from '../../../Models/Caller';
import { Campaign } from '../../../Models/Campaign';
import { Client } from '../../../Models/Client';
import { log } from '../../../tools/log';
import { cleanSatisfaction, CleanStatus, humainPhone } from '../../../tools/utils';

export default async function exportClientCsv(req: Request<any>, res: Response<any>) {
	const ip = req.socket?.remoteAddress?.split(':').pop();
	if (
		!req.body ||
		typeof req.body.adminCode != 'string' ||
		!ObjectId.isValid(req.body.area) ||
		(req.body.CampaignId && !ObjectId.isValid(req.body.CampaignId))
	) {
		res.status(400).send({ message: 'Missing parameters', OK: false });
		log(`Missing parameters from ` + ip, 'WARNING', __filename);
		return;
	}

	const area = await Area.findOne({ adminPassword: { $eq: req.body.adminCode }, _id: { $eq: req.body.area } }, [
		'name'
	]);
	if (!area) {
		res.status(401).send({ message: 'Wrong admin code', OK: false });
		log(`Wrong admin code from ${ip}`, 'WARNING', __filename);
		return;
	}
	let selector = { area: area._id };

	let campaign: InstanceType<typeof Campaign> | null = null;

	if (req.body.CampaignId) {
		campaign = await Campaign.findOne({ _id: { $eq: req.body.CampaignId }, area: area._id }, []);
	} else {
		campaign = await Campaign.findOne({ area: area._id, active: true }, []);
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
			statut?: 'En cours' | 'Doit etre rappelé·e' | 'Applé·e' | 'Supprimé·e' | 'Aucune info';
			resultat?: 'A voté' | 'Pas interessé·e' | 'Interessé·e' | 'Pas de réponse' | 'A retirer' | 'Aucune info';
			appeleant?: string;
			commentaire?: string;
			nombreAppel?: number;
		} = {};
		const lastCall = await Call.findOne({ client: client._id, campaign: campaign._id }).sort({ start: -1 });

		if (lastCall) {
			csvData.statut = CleanStatus(lastCall?.status);
			csvData.resultat = cleanSatisfaction(lastCall?.satisfaction);
			csvData.appeleant =
				(await Caller.findOne({ client: lastCall.caller, area: area._id }, ['name']))?.name ?? 'Erreur';
			csvData.commentaire = lastCall?.comment ?? '';
			csvData.nombreAppel = (await Call.countDocuments({ client: client._id, campaign: campaign._id })) ?? -1;
		}
		csvStream.write({
			nom: client.name,
			telephone: humainPhone(client.phone),
			statut: csvData.statut ?? '',
			resultat: csvData.resultat ?? '',
			appeleant: csvData.appeleant ?? '',
			commentaire: csvData.commentaire ?? '',
			nombreAppel: csvData.nombreAppel ?? 0
		});
	});
	csvStream.end();
	res.end();
	log(`Exported ${numberOfClients} clients from ${ip} (${area.name})`, 'INFO', __filename);
}
