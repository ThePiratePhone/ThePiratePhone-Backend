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
let callerId: mongoose.Types.ObjectId | undefined;

beforeAll(async () => {
	await mongoose.connect(process.env.URITEST ?? '');
	await Caller.deleteMany({});
	await Area.deleteMany({});
	await Client.deleteMany({});
	await Campaign.deleteMany({});

	areaId = (
		await Area.create({
			name: 'changepassordtest',
			password: 'password',
			campaignList: [],
			adminPassword: 'adminPassword'
		})
	)._id;
	await Caller.create({
		name: 'name',
		phone: '+33423456780',
		area: areaId,
		pinCode: '1234'
	});
	callerId = (
		await Caller.create({
			name: 'name1',
			phone: '+33423456781',
			area: areaId,
			pinCode: '1234'
		})
	).id;
});

afterAll(async () => {
	await mongoose.connection.close();
});

describe('post on api/otherCaller/info', () => {
	it('should return 400 if invalid phone number', async () => {
		const res = await request(app).post('/otherCaller/info').send({
			phone: 'hello',
			pinCode: '1234',
			otherPhone: '+33423456780',
			area: areaId
		});
		expect(res.status).toBe(400);
		expect(res.body).toHaveProperty('message', 'Invalid phone number');
	});

	it('should return 400 if invalid otherPhone number', async () => {
		const res = await request(app).post('/otherCaller/info').send({
			phone: '+33423456780',
			pinCode: '1234',
			otherPhone: 'hello',
			area: areaId
		});
		expect(res.status).toBe(400);
		expect(res.body).toHaveProperty('message', 'Invalid phone number');
	});

	it('should return 403 if invalid credential', async () => {
		const res = await request(app).post('/otherCaller/info').send({
			phone: '+33423456780',
			pinCode: '12345',
			otherPhone: '+33423456781',
			area: areaId
		});
		expect(res.status).toBe(403);
		expect(res.body).toHaveProperty('message', 'Invalid credential');
	});

	it('should return 404 if no active campaign', async () => {
		const res = await request(app).post('/otherCaller/info').send({
			phone: '+33423456780',
			pinCode: '1234',
			otherPhone: '+33423456781',
			area: areaId
		});
		expect(res.status).toBe(404);
		expect(res.body).toHaveProperty('message', 'No active campaign');
	});

	it('should return 404 if caller not found', async () => {
		await Campaign.updateMany({ active: true }, { active: false });
		const campaignID = (
			await Campaign.create({
				area: areaId,
				active: true,
				name: 'campaign',
				phoneList: [],
				satisfaction: 0,
				password: 'password',
				script: 'script'
			})
		).id;
		await Area.findByIdAndUpdate(areaId, { $push: { campaignList: campaignID } });
		const res = await request(app).post('/otherCaller/info').send({
			phone: '+33423456780',
			pinCode: '1234',
			otherPhone: '+33423456782',
			area: areaId
		});
		expect(res.status).toBe(404);
		expect(res.body).toHaveProperty('message', 'Caller not found');
	});

	it('should return 200 if OK', async () => {
		await Campaign.updateMany({ active: true }, { active: false });
		const campaignID = (
			await Campaign.create({
				area: areaId,
				active: true,
				name: 'campaign2', // change for avoid conflict
				phoneList: [],
				satisfaction: 0,
				password: 'password',
				script: 'script'
			})
		).id;
		await Area.findByIdAndUpdate(areaId, { $push: { campaignList: campaignID } });
		const res = await request(app).post('/otherCaller/info').send({
			phone: '+33423456780',
			pinCode: '1234',
			otherPhone: '+33423456781',
			area: areaId
		});
		expect(res.status).toBe(200);
		expect(res.body).toHaveProperty('OK', true);
		expect(res.body).toHaveProperty('data');
		expect(res.body.data).toHaveProperty('count', 0);
		expect(res.body.data).toHaveProperty('duration', 0);
	});

	it('should return 200 if OK with call', async () => {
		await Campaign.updateMany({ active: true }, { active: false });
		const campaignID = (
			await Campaign.create({
				area: areaId,
				active: true,
				name: 'campaign2', // change for avoid conflict
				phoneList: [],
				satisfaction: 0,
				password: 'password',
				script: 'script'
			})
		).id;
		await Area.findByIdAndUpdate(areaId, { $push: { campaignList: campaignID } });
		const clientId = await Client.create({
			phone: '+33423456782',
			name: 'name1',
			priority: [{ campaign: campaignID, id: '-1' }]
		});
		await Call.create({
			caller: callerId,
			campaign: campaignID,
			duration: 10,
			client: clientId,
			start: Date.now() - 10_000,
			lastInteraction: new Date()
		});
		const res = await request(app).post('/otherCaller/info').send({
			phone: '+33423456780',
			pinCode: '1234',
			otherPhone: '+33423456781',
			area: areaId
		});
		expect(res.status).toBe(200);
		expect(res.body).toHaveProperty('OK', true);
		expect(res.body).toHaveProperty('data');
		expect(res.body.data).toHaveProperty('count', 1);
		expect(res.body.data).toHaveProperty('duration', 10);
	});
});
