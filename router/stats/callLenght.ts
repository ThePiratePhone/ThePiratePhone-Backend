import { ObjectId } from 'mongodb';
import { log } from '../../tools/log';
import { Request, Response } from 'express';

export default async function callLenght(req: Request<any>, res: Response<any>) {
	const ip = req.socket?.remoteAddress?.split(':').pop();
	if (
		!req.body ||
		!ObjectId.isValid(req.body.campaign) ||
		typeof req.body.adminCode != 'string' ||
		!ObjectId.isValid(req.body.area)
	) {
		res.status(400).send({ message: 'Missing parameters', OK: false });
		log(`Missing parameters from ${ip}`, 'WARNING', 'callePerClient.ts');
		return;
	}
}
