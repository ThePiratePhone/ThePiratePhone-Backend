import { Request, Response } from 'express';
import { log } from '../../tools/log';
import { clearPhone, phoneNumberCheck } from '../../tools/utils';
import { Caller } from '../../Models/Caller';
import { Call } from '../../Models/Call';

export default async function endCall(req: Request<any>, res: Response<any>) {
	const ip = req.socket?.remoteAddress?.split(':').pop();
	if (
		!req.body ||
		typeof req.body.phone != 'string' ||
		typeof req.body.pinCode != 'string' ||
		typeof req.body.timeInCall != 'number' ||
		typeof req.body.satisfaction != 'number' ||
		(req.body.comment && typeof req.body.comment != 'string')
	) {
		res.status(400).send({ message: 'Missing parameters', OK: false });
		log(`Missing parameters`, 'WARNING', __filename);
		return;
	}

	if (req.body.pinCode.length != 4) {
		res.status(400).send({ message: 'Invalid pin code', OK: false });
		log(`Invalid pin code`, 'WARNING', __filename);
		return;
	}

	req.body.phone = clearPhone(req.body.phone);
	if (phoneNumberCheck(req.body.phone)) {
		res.status(400).send({ message: 'Invalid phone number', OK: false });
		log(`Invalid phone number`, 'WARNING', __filename);
		return;
	}

	req.body.timeInCall = Math.min(req.body.timeInCall, 1_200_000);

	if (![-1, 0, 1, 2, 3, 4].includes(req.body.satisfaction)) {
		res.status(400).send({ message: 'satisfaction is not a valid number', OK: false });
		log(`satisfaction is not a valid number from ` + ip, 'WARNING', __filename);
		return;
	}

	const caller = await Caller.findOne({ phone: req.body.phone, pinCode: req.body.pinCode }, ['name']);
	if (!caller) {
		res.status(403).send({ message: 'Invalid credential', OK: false });
		log(`Invalid credential from: ${req.body.phone} (${ip})`, 'WARNING', __filename);
		return;
	}

	const call = await Call.findOne({ caller: caller._id, status: 'In progress' });
	if (!call) {
		res.status(403).send({ message: 'No call in progress', OK: false });
		log(`No call in progress from: ${req.body.phone} (${ip})`, 'WARNING', __filename);
		return;
	}

	call.status = 'Done';
	call.satisfaction = req.body.satisfaction;
	if (req.body.comment) call.comment = req.body.comment;
	if (req.body.satisfaction == -1) {
		call.status = 'deleted';
	}

	try {
		await call.save();
		res.status(200).send({ message: 'Call ended', OK: true });
		log(`Call ended by ${caller.name} (${req.body.phone})`, 'INFORMATION', __filename);
	} catch (e) {
		res.status(500).send({ message: 'Internal error', OK: false });
		log(`Internal error: ${e}`, 'ERROR', __filename);
	}
}
