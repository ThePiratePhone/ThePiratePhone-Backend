import dotenv from 'dotenv';
import mongoose from 'mongoose';
import request from 'supertest';
import app from '../../index';
import { Area } from '../../Models/Area';
import { Call } from '../../Models/Call';
import { Caller } from '../../Models/Caller';
import { Campaign } from '../../Models/Campaign';
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
		name: 'giveupTest',
		password: 'password',
		campaignList: [],
		adminPassword: 'adminPassword'
	});
	areaId = (await Area.findOne({ name: 'giveupTest' }))?._id;
	await Campaign.create({
		name: 'giveupTest',
		script: 'giveupTest',
		active: true,
		area: areaId,
		status: ['In progress', 'Finished'],
		password: 'password'
	});
	campaignId = (await Campaign.findOne({ name: 'giveupTest' }))?._id;
	await Caller.create({
		name: 'giveupTest',
		phone: '+33634567890',
		pinCode: '1234',
		area: areaId,
		campaigns: campaignId
	});
	await Client.create({
		name: 'giveup',
		firstname: 'test',
		phone: '+33712457837',
		area: areaId,
		campaigns: [campaignId]
	});
});

afterAll(async () => {
	await mongoose.connection.close();
});
describe('post on /caller/giveup', () => {
	it('should return 400 if phone is invalid', async () => {
		const res = await request(app).post('/caller/giveup').send({
			phone: 'invalid',
			pinCode: '1234',
			area: areaId,
			campaign: campaignId
		});
		expect(res.status).toBe(400);
		expect(res.body).toMatchObject({ message: 'Invalid phone number', OK: false });
	});

	it('should return 400 if caller dont exist', async () => {
		const res = await request(app).post('/caller/giveup').send({
			phone: '+33634567890',
			pinCode: '1235',
			area: areaId,
			campaign: campaignId
		});
		expect(res.status).toBe(403);
		expect(res.body).toMatchObject({ message: 'Invalid credential or incorrect area', OK: false });
	});

	it('should return 404 if no call in progress', async () => {
		const res = await request(app).post('/caller/giveup').send({
			phone: '+33634567890',
			pinCode: '1234',
			area: areaId,
			campaign: campaignId
		});
		expect(res.status).toBe(404);
		expect(res.body).toMatchObject({ message: 'No call in progress', OK: false });
	});

	it('should return 200 if call ended', async () => {
		await Call.create({
			caller: (await Caller.findOne({ phone: '+33634567890' }))?._id,
			client: (await Client.findOne({ phone: '+33712457837' }))?._id,
			campaign: campaignId,
			satisfaction: 'In progress'
		});
		const res = await request(app).post('/caller/giveup').send({
			phone: '+33634567890',
			pinCode: '1234',
			area: areaId,
			campaign: campaignId
		});
		expect(res.status).toBe(200);
		expect(res.body).toMatchObject({ message: 'Call ended', OK: true });
	});
});
