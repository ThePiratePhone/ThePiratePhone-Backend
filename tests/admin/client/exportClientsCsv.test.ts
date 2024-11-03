import dotenv from 'dotenv';
import mongoose, { Types } from 'mongoose';
import request from 'supertest';
import app from '../../../index';
import { Area } from '../../../Models/Area';
import { Campaign } from '../../../Models/Campaign';
import { Client } from '../../../Models/Client';

dotenv.config({ path: '.env' });

let areaId: mongoose.Types.ObjectId | undefined;
let campaignId: mongoose.Types.ObjectId | undefined;

const adminCode =
	'b109f3bbbc244eb82441917ed06d618b9008dd09b3befd1b5e07394c706a8bb980b1d7785e5976ec049b46df5f1326af5a2ea6d103fd07c95385ffab0cacbc86'; //password

beforeAll(async () => {
	await mongoose.connect(process.env.URITEST ?? '');
	await Area.deleteMany({});
	await Client.deleteMany({});

	areaId = (
		await Area.create({
			name: 'exportClientsCsvTest',
			password: 'password',
			campaignList: [],
			adminPassword: adminCode
		})
	).id;

	campaignId = (
		await Campaign.create({
			name: 'exportClientsCsvTest',
			script: 'exportClientsCsvTest',
			active: true,
			area: areaId,
			status: ['In progress', 'Finished'],
			password: 'password'
		})
	).id;
	Area.updateOne({ _id: areaId }, { $push: { campaignList: campaignId } });
});

afterAll(async () => {
	await mongoose.connection.close();
});

describe('post on /api/admin/client/exportClientsCsv', () => {
	it('should return 401 if admin code is wrong', async () => {
		const res = await request(app).post('/api/admin/client/exportClientsCsv').send({
			adminCode: 'wrongPassword',
			area: areaId
		});
		expect(res.status).toEqual(401);
		expect(res.body).toEqual({ message: 'Wrong admin code', OK: false });
	});

	it('should return 401 if wrong campaign id', async () => {
		const res = await request(app).post('/api/admin/client/exportClientsCsv').send({
			adminCode,
			area: areaId,
			CampaignId: new Types.ObjectId(),
			allreadyHaseded: true
		});
		expect(res.status).toEqual(401);
		expect(res.body).toEqual({ message: 'Wrong campaign id', OK: false });
	});

	it('should return 200 if OK', async () => {
		const res = await request(app).post('/api/admin/client/exportClientsCsv').send({
			adminCode,
			area: areaId,
			allreadyHaseded: true
		});
		expect(res.status).toEqual(200);
	});
});
