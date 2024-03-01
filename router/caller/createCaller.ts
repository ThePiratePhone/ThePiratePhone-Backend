import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import { log } from '../../tools/log';
import { Area } from '../../Models/Area';
import { Caller } from '../../Models/Caller';
import phoneNumberCheck from '../../tools/phoneNumberCheck';
import clearPhone from '../../tools/clearPhone';

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

	if (req.body.pinCode.length != 4) {
		res.status(400).send({ message: 'Invalid pin code', OK: false });
		log(`Invalid pin code from: ` + ip, 'WARNING', 'createCaller.ts');
		return;
	}

	req.body.phone = clearPhone(req.body.phone);

	if (!phoneNumberCheck(req.body.phone)) {
		res.status(400).send({ message: 'Wrong phone number', OK: false });
		log('Wrong phone number', 'WARNING', 'createCaller.ts');
		return;
	}

	const area = await Area.findOne({ _id: req.body.area });
	if (!area) {
		res.status(400).send({ message: 'Invalid area', OK: false });
		log(`Invalid area from: ${req.body.phone} (${ip})`, 'WARNING', 'createCaller.ts');
		return;
	}

	if (area.password != req.body.AreaPassword) {
		res.status(400).send({ message: 'Invalid area password', OK: false });
		log(`Invalid area password from: ${req.body.phone} (${ip})`, 'WARNING', 'createCaller.ts');
		return;
	}

	if ((await Caller.findOne({ phone: req.body.phone })) || (await Caller.findOne({ name: req.body.name }))) {
		res.status(400).send({ message: 'caller already exist', OK: false });
		log(`caller already exist from ${req.body.phone} (${ip})`, 'WARNING', 'createCaller.ts');
		return;
	}

	const newCaller = new Caller({
		phone: req.body.phone,
		pinCode: req.body.pinCode,
		area: area._id,
		timeInCall: [],
		name: req.body.CallerName
	});

	const result = await newCaller.save();
	if (!result) {
		res.status(500).send({ message: 'Internal error', OK: false });
		log(`Error while saving caller`, 'CRITICAL', 'createCaller.ts');
		return;
	}

	res.status(200).send({ message: 'caller ' + newCaller.name + ' created from ' + ip, OK: true });
	log(`Caller ${newCaller.name} created from ${area.name} (${ip})`, 'INFORMATION', 'createCaller.ts');
}
