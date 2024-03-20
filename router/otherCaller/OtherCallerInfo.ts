import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import { log } from '../../tools/log';
import clearPhone from '../../tools/clearPhone';
import phoneNumberCheck from '../../tools/phoneNumberCheck';
import { Caller } from '../../Models/Caller';
import { Area } from '../../Models/Area';
import { NativeBuffer } from 'mongoose';

export default async function OtherCallerInfo(req: Request<any>, res: Response<any>) {
	const ip = req.socket?.remoteAddress?.split(':').pop();

	if (
		!req.body ||
		typeof req.body.phone != 'string' ||
		typeof req.body.pinCode != 'string' ||
		typeof req.body.otherPhone != 'string' ||
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

	req.body.otherPhone = clearPhone(req.body.otherPhone);
	if (!phoneNumberCheck(req.body.otherPhone)) {
		res.status(400).send({ message: 'Wrong phone number (otherPhone)', OK: false });
		log(`Wrong phone number (otherPhone) from: ` + ip, 'WARNING', 'scoreBoard.ts');
		return;
	}

	const caller = await Caller.findOne({ phone: req.body.phone, area: req.body.area, pinCode: req.body.pinCode });
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

	const call = await Caller.findOne({ area: req.body.area, phone: req.body.otherPhone });
	if (!call) {
		res.status(404).send({ message: 'Caller not found', OK: false });
		log(`Caller not found from: ` + ip, 'WARNING', 'scoreBoard.ts');
		return;
	}

	res.status(200).send({
		message: 'OK',
		OK: true,
		data: {
			name: call.name,
			phone: call.phone,
			totalTime: call.timeInCall.reduce((acc, cur) => acc + cur.time, 0),
			nbCalls: call.timeInCall.length
		}
	});
	log(`Caller info get from: ${caller.name} (${ip})`, 'INFORMATION', 'scoreBoard.ts');
}
