import dotenv from 'dotenv';
import mongoose from 'mongoose';
import request from 'supertest';
import app from '../../index';
import { Area } from '../../Models/Area';
import { Caller } from '../../Models/Caller';
import { Campaign } from '../../Models/Campaign';
import { Call } from '../../Models/Call';
import { Client } from '../../Models/Client';

dotenv.config({ path: '.env' });
let areaId: mongoose.Types.ObjectId | undefined;
let campaignId: mongoose.Types.ObjectId | undefined;
beforeAll(async () => {
	await mongoose.connect(process.env.URITEST ?? '');
	await Caller.deleteMany({});
	await Area.deleteMany({});
	await Campaign.deleteMany({});
	await Call.deleteMany({});
	await Client.deleteMany({});
	await Area.create({
		name: 'getProgressTest',
		password: 'password',
		campaignList: [],
		adminPassword: 'adminPassword'
	});
	areaId = (await Area.findOne({ name: 'getProgressTest' }))?._id;
	await Campaign.create({
		name: 'getProgressTest',
		script: 'getProgressTest',
		active: true,
		area: areaId,

		status: [
			{ name: 'À rappeler', toRecall: true },
			{ name: 'À retirer', toRecall: false }
		],

		password: 'password'
	});
	campaignId = (await Campaign.findOne({ name: 'getProgressTest' }))?._id;
	await Caller.create({
		name: 'getProgressTest',
		phone: '+33734567890',
		pinCode: '1234',
		campaigns: campaignId
	});
	await Client.create({
		name: 'getProgress',
		firstname: 'test',
		phone: '+33712457836',
		area: areaId,
		campaigns: [campaignId],
		priority: [{ campaign: campaignId, id: '-1' }]
	});
});

afterAll(async () => {
	await mongoose.connection.close();
});

describe('post on /caller/getProgress', () => {
	it('should return 400 if phone is invalid', async () => {
		const res = await request(app).post('/caller/getProgress').send({
			phone: 'invalid',
			pinCode: '1234',
			campaign: campaignId
		});
		expect(res.status).toBe(400);
		expect(res.body).toMatchObject({ message: 'Invalid phone number', OK: false });
	});

	it('should return 400 if caller dont exist', async () => {
		const res = await request(app).post('/caller/getProgress').send({
			phone: '+33734567890',
			pinCode: '1235',
			campaign: campaignId
		});
		expect(res.status).toBe(403);
		expect(res.body).toMatchObject({ message: 'Invalid credential or incorrect campaigns', OK: false });
	});

	it('should return 404 if Campaign is not active', async () => {
		await Campaign.create({
			name: 'getProgressTest2',
			script: 'getProgressTest2',
			active: false,
			area: areaId,
			status: [
				{ name: 'À rappeler', toRecall: true },
				{ name: 'À retirer', toRecall: false }
			],
			password: 'password'
		});
		const campaignId = (await Campaign.findOne({ name: 'getProgressTest2' }))?._id;
		await Caller.create({
			name: 'getProgressTest2',
			phone: '+33734567891',
			pinCode: '1234',
			campaigns: campaignId
		});
		const res = await request(app).post('/caller/getProgress').send({
			phone: '+33734567891',
			pinCode: '1234',
			campaign: campaignId
		});
		expect(res.status).toBe(404);
		expect(res.body).toMatchObject({ message: 'Campaign not found or not active', OK: false });
	});

	it('should return 200 if all is ok', async () => {
		const res = await request(app).post('/caller/getProgress').send({
			phone: '+33734567890',
			pinCode: '1234',
			campaign: campaignId
		});
		expect(res.status).toBe(200);
		expect(res.body).toEqual({
			message: 'OK',
			OK: true,
			data: {
				totalClientCalled: 0,
				totalDiscution: 0,
				totalCall: 0,
				totalUser: 1,
				totalConvertion: 0,
				totalCallTime: 0
			}
		});
	});
});
