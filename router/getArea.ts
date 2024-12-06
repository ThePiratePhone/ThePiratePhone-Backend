import { Request, Response } from 'express';

import { Area } from '../Models/Area';
import { log } from '../tools/log';

/**
 * Get all area
 * @throws {404}: no area found
 * @throws {200}: OK
 */
export default async function getArea(req: Request<any>, res: Response<any>) {
	const ip =
		(Array.isArray(req.headers['x-forwarded-for'])
			? req.headers['x-forwarded-for'][0]
			: req.headers['x-forwarded-for']?.split(',')?.[0] ?? req.ip) ?? 'no IP';

	const area = await Area.find();
	if (!area || area.length == 0) {
		res.status(404).send({ message: 'No area fond', OK: false });
		log(`[${ip}] Error while getting area`, 'WARNING', __filename);
		return;
	}
	log(`[${ip}] Get area`, 'INFO', __filename);
	res.status(200).send({
		message: 'OK',
		OK: true,
		data: area.map(a => {
			return { name: a.name, _id: a._id };
		})
	});
}
