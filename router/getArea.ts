import { Request, Response } from 'express';

import { Area } from '../Models/Area';
import { log } from '../tools/log';

/**
 * Get all area
 * @throws {500}: Internal error
 * @throws {200}: OK
 */
export default async function getArea(req: Request<any>, res: Response<any>) {
	const ip = req.socket?.remoteAddress?.split(':').pop();

	const area = await Area.find();
	if (!area) {
		res.status(500).send({ message: 'Internal error', OK: false });
		log(`Error while getting area from ` + ip, 'CRITICAL', __filename);
		return;
	}
	log(`Get area from ` + ip, 'INFO', __filename);
	res.status(200).send({
		message: 'OK',
		OK: true,
		data: area.map(a => {
			return { name: a.name, _id: a._id };
		})
	});
}
