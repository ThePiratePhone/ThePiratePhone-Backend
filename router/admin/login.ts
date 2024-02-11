import { Request, Response } from 'express';
import { log } from '../../tools/log';
import { ObjectId } from 'mongodb';
import { Area } from '../../Models/area';

export default async function exportCallerCsv(req: Request<any>, res: Response<any>) {
	const ip = req.socket?.remoteAddress?.split(':').pop();
	if (!req.body || typeof req.body.adminCode != 'string' || !ObjectId.isValid(req.body.area)) {
		res.status(400).send({ message: 'Missing parameters', OK: false });
		log(`Missing parameters from ` + ip, 'WARNING', 'exportCallerCsv.ts');
		return;
	}

	if (!(await Area.findOne({ _id: req.body.area, AdminPassword: req.body.adminCode }))) {
		res.status(401).send({ message: 'Wrong admin code', OK: false });
		log(`Wrong admin code from ${ip}`, 'WARNING', 'exportCallerCsv.ts');
		return;
	}

	res.status(200).send({ message: 'OK', OK: true });
}
