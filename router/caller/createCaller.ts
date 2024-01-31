import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import { log } from '../../tools/log';
import { Area } from '../../Models/area';
import { Caller } from '../../Models/Caller';

export default async function createCaller(req: Request<any>, res: Response<any>) {
	const ip = req.socket?.remoteAddress?.split(':').pop();
	if (
		!req.body ||
		typeof req.body.phone != 'string' ||
		typeof req.body.pinCode != 'string' ||
		!ObjectId.isValid(req.body.area) ||
		typeof req.body.AreaPassword != 'string' ||
		typeof req.body.CallerName != 'string'
	) {
		res.status(400).send({ message: 'Missing parameters', OK: false });
		log(`Missing parameters from: ` + ip, 'WARNING', 'createCaller.ts');
		return;
	}

	const area = await Area.findOne({ _id: req.body.area });
	if (!area) {
		res.status(400).send({ message: 'Invalid area', OK: false });
		log(`Invalid area from: ` + ip, 'WARNING', 'createCaller.ts');
		return;
	}

	if (area.password != req.body.AreaPassword) {
		res.status(400).send({ message: 'Invalid area password', OK: false });
		log(`Invalid area password from: ` + ip, 'WARNING', 'createCaller.ts');
		return;
	}

	const caller = new Caller({
		phone: req.body.phone,
		pinCode: req.body.pinCode,
		area: area._id,
		timeInCall: [],
		name: req.body.CallerName
	});

	const result = await caller.save();
	if (!result) {
		res.status(500).send({ message: 'Internal error', OK: false });
		log(`Error while saving caller`, 'CRITICAL', 'createCaller.ts');
		return;
	}

	res.status(200).send({ message: 'caller ' + caller.name + ' created from ' + ip, OK: true });
	log(`Caller ${caller.name} created from ${ip}`, 'INFORMATION', 'createCaller.ts');
}
