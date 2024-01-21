import { Request, Response } from 'express';

import checkCredentials from '../tools/checkCredentials';
import { log } from '../tools/log';

export default async function login(req: Request<any>, res: Response<any>) {
	const ip = req.socket?.remoteAddress?.split(':').pop();

	if (
		!req.body ||
		typeof req.body.phone != 'string' ||
		typeof req.body.pinCode != 'string' ||
		typeof req.body.area != 'string'
	) {
		res.status(400).send({ message: 'Missing parameters', OK: false });
		log(`Missing parameters from: ` + ip, 'WARNING', 'login');
		return;
	}

	if (req.body.pinCode.length != 4) {
		res.status(400).send({ message: 'Wrong pin code', OK: false });
		log(`Wrong pin code from: ` + ip, 'WARNING', 'login');
		return;
	}

	const caller = await checkCredentials(req.body.phone, req.body.area, req.body.pinCode);
	if (!caller) {
		res.status(403).send({ message: 'Wrong credentials', OK: false });
		log(`Wrong credentials from: ` + ip, 'WARNING', 'login');
		return;
	} else {
		res.status(200).send({ message: 'OK', OK: true, data: caller });
		log(`Login success for ${caller.name} from: ` + ip, 'INFORMATION', 'login');
		return;
	}
}
