import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import { log } from '../../../tools/log';
import { Area } from '../../../Models/Area';
import clearPhone from '../../../tools/clearPhone';
import phoneNumberCheck from '../../../tools/phoneNumberCheck';

export default async function cleanAspiration(
	req: Request<any>,
	res: Response<any>,
	aspirationDetector: Map<String, number>
) {
	const ip = req.socket?.remoteAddress?.split(':').pop();
	if (
		!req.body ||
		typeof req.body.adminCode != 'string' ||
		typeof req.body.phone != 'string' ||
		!ObjectId.isValid(req.body.area)
	) {
		res.status(400).send({ message: 'Missing parameters', OK: false });
		log(`Missing parameters from ` + ip, 'WARNING', 'cleanAspiration.ts');
		return;
	}

	const area = await Area.findOne({ _id: req.body.area, AdminPassword: req.body.adminCode });
	if (!area) {
		res.status(401).send({ message: 'Wrong admin code', OK: false });
		log(`Wrong admin code from ${ip}`, 'WARNING', 'cleanAspiration.ts');
		return;
	}

	req.body.phone = clearPhone(req.body.phone);
	if (!phoneNumberCheck(req.body.phone)) {
		res.status(400).send({ message: 'Invalid phone number', OK: false });
		log(`Invalid phone number from ${ip}`, 'WARNING', 'cleanAspiration.ts');
		return;
	}

	if (!aspirationDetector.has(req.body.phone)) {
		res.status(200).send({ message: 'No aspiration for this caller', OK: true });
		log(`No aspiration for this caller from ${ip}`, 'INFORMATION', 'cleanAspiration.ts');
		return;
	}

	aspirationDetector.delete(req.body.phone);

	res.status(200).send({ message: 'Aspiration cleared', OK: true });
	log(`Aspiration cleared from ${ip}`, 'INFORMATION', 'cleanAspiration.ts');
}
