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
		name: 'joincampaignTest',
		password: 'password',
		campaignList: [],
		adminPassword: 'adminPassword'
	});
	areaId = (await Area.findOne({ name: 'joincampaignTest' }))?._id;
	await Campaign.create({
		name: 'joincampaignTest',
		script: 'joincampaignTest',
		active: true,
		area: areaId,

		status: [
			{ name: 'À rappeler', toRecall: true },
			{ name: 'À retirer', toRecall: false }
		],

		password: 'password'
	});
	campaignId = (await Campaign.findOne({ name: 'joincampaignTest' }))?._id;
	await Caller.create({
		name: 'joincampaignTest',
		phone: '+33534567900',
		pinCode: '1234',
		area: areaId,
		campaigns: campaignId
	});
	await Client.create({
		name: 'joincampaign',
		firstname: 'test',
		phone: '+33712457837',
		area: areaId,
		campaigns: [campaignId]
	});
});

afterAll(async () => {
	await mongoose.connection.close();
});
describe('post on /caller/joinCampaign', () => {
	it('should return 400 if phone is invalid', async () => {
		const res = await request(app).post('/caller/joinCampaign').send({
			phone: 'invalid',
			pinCode: '1234',
			destinationArea: areaId,
			campaignPassword: 'password'
		});
		expect(res.status).toBe(400);
		expect(res.body.OK).toBe(false);
	});

	it('should return 403 if caller not found', async () => {
		const res = await request(app).post('/caller/joinCampaign').send({
			phone: '+33534567901',
			pinCode: '1234',
			destinationArea: areaId,
			campaignPassword: 'password'
		});
		expect(res.status).toBe(403);
		expect(res.body.OK).toBe(false);
	});

	it('should return 404 if campaign not found', async () => {
		const res = await request(app).post('/caller/joinCampaign').send({
			phone: '+33534567900',
			pinCode: '1234',
			destinationArea: areaId,
			campaignPassword: 'password2'
		});
		expect(res.status).toBe(404);
		expect(res.body.OK).toBe(false);
	});

	it('should return 403 if already joined campaign', async () => {
		const res = await request(app).post('/caller/joinCampaign').send({
			phone: '+33534567900',
			pinCode: '1234',
			destinationArea: areaId,
			campaignId: new mongoose.Types.ObjectId(),
			campaignPassword: 'password'
		});
		expect(res.status).toBe(403);
		expect(res.body.OK).toBe(false);
	});

	it('should return 200 if joined campaign', async () => {
		const out = await Campaign.create({
			name: 'joincampaignTest2',
			script: 'joincampaignTest2',
			active: true,
			area: areaId,
			status: [
				{ name: 'À rappeler', toRecall: true },
				{ name: 'À retirer', toRecall: false }
			],
			password: 'password2'
		});
		const res = await request(app).post('/caller/joinCampaign').send({
			phone: '+33534567900',
			pinCode: '1234',
			destinationArea: areaId,
			campaignId: out._id,
			campaignPassword: 'password2'
		});
		expect(res.status).toBe(200);
		expect(res.body.OK).toBe(true);
	});
});
