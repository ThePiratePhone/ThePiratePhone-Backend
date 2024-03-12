import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import { log } from '../../../tools/log';
import { Area } from '../../../Models/Area';
import { Client } from '../../../Models/Client';

export default async function removeAllClients(req: Request<any>, res: Response<any>) {
	const ip = req.socket?.remoteAddress?.split(':').pop();
	if (!req.body || typeof req.body.adminCode != 'string' || !ObjectId.isValid(req.body.area)) {
		res.status(400).send({ message: 'Missing parameters', OK: false });
		log(`Missing parameters from ` + ip, 'WARNING', 'removeAllClients.ts');
		return;
	}

	const area = await Area.findOne({ AdminPassword: req.body.adminCode, _id: req.body.area });
	if (!area) {
		res.status(401).send({ message: 'Wrong admin code', OK: false });
		log(`Wrong admin code from ${ip}`, 'WARNING', 'removeAllClients.ts');
		return;
	}

	try {
		await Client.deleteMany({ area: req.body.area });
	} catch (e) {
		res.status(500).send({ message: 'Database error', OK: false });
		log(`Database error from ${ip}`, 'ERROR', 'removeAllClients.ts');
		return;
	}
	res.status(200).send({ message: 'OK', OK: true });
	log(`Clients removed from ${ip} (${area.name})`, 'INFORMATION', 'removeAllClients.ts');
}
