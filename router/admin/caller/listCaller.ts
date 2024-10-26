import { Request, Response } from 'express';
import { Area } from '../../../Models/Area';
import { Caller } from '../../../Models/Caller';
import { log } from '../../../tools/log';
import { checkParameters } from '../../../tools/utils';

/**
 * List all callers in an area
 *
 * @example
 * body:{
 * 	"adminCode": string,
 * 	"area": mongoDBID,
 * 	"skip": number,
 * 	"limit": number
 * }
 *
 * @throws {400} - Missing parameters
 * @throws {401} - Wrong admin code
 * @throws {404} - No caller found
 * @throws {200} - OK
 **/
export default async function listCaller(req: Request<any>, res: Response<any>) {
	const ip = req.hostname;

	if (
		!checkParameters(
			req.body,
			res,
			[
				['adminCode', 'string'],
				['area', 'ObjectId'],
				['skip', 'number', true],
				['limit', 'number', true]
			],
			__filename
		)
	)
		return;

	const area = await Area.findOne({ adminPassword: { $eq: req.body.adminCode }, _id: { $eq: req.body.area } });
	if (!area) {
		res.status(401).send({ message: 'Wrong admin code', OK: false });
		log(`Wrong admin code from ` + ip, 'WARNING', __filename);
		return;
	}

	const numberOfCallers = await Caller.countDocuments({ area: area._id });

	if (numberOfCallers === 0) {
		res.status(404).send({ message: 'No caller found', OK: false });
		log(`No caller found from ${area.name} (${ip})`, 'WARNING', __filename);
		return;
	}
	const callers = await Caller.find({ area: area._id })
		.skip(req.body.skip ? req.body.skip : 0)
		.limit(req.body.limit ? req.body.limit : 50);
	if (!callers) {
		res.status(404).send({ message: 'No caller found', OK: false });
		log(`No caller found from ${area.name} (${ip})`, 'WARNING', __filename);
		return;
	}

	res.status(200).send({ message: 'OK', OK: true, data: { callers: callers, numberOfCallers: numberOfCallers } });
	log(`caller list send to ${area.name} (${ip})`, 'INFO', __filename);
}
