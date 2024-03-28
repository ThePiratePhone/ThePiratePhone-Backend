import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import clearPhone from '../../tools/clearPhone';
import phoneNumberCheck from '../../tools/phoneNumberCheck';
import { log } from '../../tools/log';
import { Area } from '../../Models/Area';
import { Caller } from '../../Models/Caller';

export default async function ChangeName(req: Request<any>, res: Response<any>) {
	const ip = req.socket?.remoteAddress?.split(':').pop();

	if (
		!req.body ||
		typeof req.body.pinCode != 'string' ||
		!ObjectId.isValid(req.body.area) ||
		typeof req.body.phone != 'string' ||
		typeof req.body.newName != 'string'
	) {
		res.status(400).send({ message: 'Missing parameters', OK: false });
		log(`Missing parameters from ` + ip, 'WARNING', 'ChangeName.ts');
		return;
	}

	req.body.phone = clearPhone(req.body.phone);
	if (!phoneNumberCheck(req.body.phone)) {
		res.status(400).send({ message: 'Wrong phone number', OK: false });
		log('Wrong phone number from ' + ip, 'WARNING', 'ChangeName.ts');
		return;
	}

	if (req.body.newName.trim() == '') {
		res.status(400).send({ message: 'Wrong newName number', OK: false });
		log('Wrong newName number from ' + ip, 'WARNING', 'ChangeName.ts');
		return;
	}

	const area = await Area.findOne({ _id: req.body.area });
	if (!area) {
		res.status(401).send({ message: 'Wrong Area', OK: false });
		log(`Wrong admin from ${ip}`, 'WARNING', 'ChangeName.ts');
		return;
	}

	const change = await Caller.updateOne(
		{ phone: req.body.phone, area: area._id, pinCode: req.body.pinCode },
		{ name: req.body.newName }
	);
	if (change.matchedCount != 1) {
		res.status(400).send({ message: 'Caller not found', OK: false });
		log('Caller not found from ' + ip, 'WARNING', 'ChangeName.ts');
		return;
	}

	res.status(200).send({ message: 'Caller name changed', OK: false });
	log('Caller name changed from ' + ip, 'WARNING', 'ChangeName.ts');
	return;
}
