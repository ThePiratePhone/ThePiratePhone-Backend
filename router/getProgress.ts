import { Request, Response } from 'express';
import checkCredential from '../tools/checkCreantial';
import AreaCampaingProgress from '../tools/areaCampainProgress';

export default async function getProgress(req: Request<any>, res: Response<any>) {
	const ip = req.socket?.remoteAddress?.split(':').pop();
	if (
		!req.body ||
		typeof req.body.phone != 'string' ||
		typeof req.body.pinCode != 'string' ||
		typeof req.body.area != 'string'
	) {
		res.status(400).send({ message: 'Missing parameters', OK: false });
		return;
	}

	const caller = checkCredential(req.body.phone, req.body.area, req.body.pinCode);
	if (!caller) {
		res.status(401).send({ message: 'Invalid credential', OK: false });
		return;
	}
	const count = await AreaCampaingProgress(req.body.area);
	res.status(200).send({ message: 'OK', OK: true, data: count });
}
