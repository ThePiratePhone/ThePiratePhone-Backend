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
let clientId: mongoose.Types.ObjectId | undefined;
const adminCode =
	'b109f3bbbc244eb82441917ed06d618b9008dd09b3befd1b5e07394c706a8bb980b1d7785e5976ec049b46df5f1326af5a2ea6d103fd07c95385ffab0cacbc86'; //password

beforeAll(async () => {
	await mongoose.connect(process.env.URITEST ?? '');
	await Area.deleteMany({});
	await Client.deleteMany({});

	areaId = (
		await Area.create({
			name: 'searchByPhoneTest',
			password: 'password',
			campaignList: [],
			adminPassword: adminCode
		})
	).id;

	campaignId = (
		await Campaign.create({
			name: 'searchByPhoneTest',
			script: 'searchByPhoneTest',
			active: true,
			area: areaId,
			status: ['In progress', 'Finished'],
			password: 'password'
		})
	).id;

	clientId = (
		await Client.create({
			name: 'searchByPhoneTest',
			phone: '+33134567890',
			area: areaId,
			campaigns: [campaignId]
		})
	).id;
	await Client.create({
		name: 'other',
		phone: '+33134567891',
		area: areaId,
		campaigns: [campaignId]
	});
	Area.updateOne({ _id: areaId }, { $push: { campaignList: campaignId } });
});

afterAll(async () => {
	await mongoose.connection.close();
});

describe('post on /api/admin/client/searchByPhone', () => {
	it('should return 401 if wrong admin code', async () => {
		const res = await request(app).post('/api/admin/client/searchByPhone').send({
			adminCode: 'wrongPassword',
			phone: '+33134567890',
			area: areaId
		});
		expect(res.status).toBe(401);
		expect(res.body.OK).toBe(false);
	});
	test('should return 200 if OK', async () => {
		const res = await request(app).post('/api/admin/client/searchByPhone').send({
			phone: '+33134567890',
			adminCode: 'password',
			area: areaId
		});
		expect(res.status).toBe(200);
		expect(res.body).toHaveProperty('message');
		expect(res.body).toHaveProperty('OK');
		expect(res.body).toHaveProperty('data');
		expect(res.body.data).toHaveLength(1);
	});
});