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
let callerId: mongoose.Types.ObjectId | undefined;
let clientId: mongoose.Types.ObjectId | undefined;
beforeAll(async () => {
	await mongoose.connect(process.env.URITEST ?? '');
	await Caller.deleteMany({});
	await Area.deleteMany({});
	await Campaign.deleteMany({});
	await Call.deleteMany({});
	await Client.deleteMany({});
	areaId = (
		await Area.create({
			name: 'validateCall',
			password: 'password',
			campaignList: [],
			adminPassword: 'adminPassword'
		})
	)._id;
	campaignId = (
		await Campaign.create({
			name: 'validateCall',
			script: 'validateCall',
			active: true,
			area: areaId,
			status: ['In progress', 'Finished'],
			password: 'password'
		})
	)._id;
	callerId = (
		await Caller.create({
			name: 'validateCallCaller',
			phone: '+33334567901',
			pinCode: '1234',
			area: areaId,
			campaigns: campaignId
		})
	)._id;

	clientId = (
		await Client.create({
			name: 'validateCallClient',
			phone: '+33334567902',
			campaigns: [campaignId]
		})
	)._id;

	await Call.create({
		caller: callerId,
		client: clientId,
		campaign: campaignId,
		satisfaction: 'In progress',
		area: areaId
	});
});

afterAll(async () => {
	await mongoose.connection.close();
});

describe('post on /caller/validateCall', () => {
	it('should return 400 if phone is invalid', async () => {
		const res = await request(app).post('/caller/validateCall').send({
			phone: 'invalid',
			pinCode: '1234',
			area: areaId,
			satisfaction: 'Finished',
			status: false,
			phoneNumber: '34567902',
			comment: 'comment'
		});
		expect(res.status).toBe(400);
		expect(res.body.OK).toBe(false);
		expect(res.body.message).toBe('Invalid caller phone number');
	});

	it('should return 403 if pin is invalid', async () => {
		const res = await request(app).post('/caller/validateCall').send({
			phone: '+33334567901',
			pinCode: '1235',
			area: areaId,
			satisfaction: 'Finished',
			status: false,
			phoneNumber: '+33334567902',
			comment: 'comment'
		});
		expect(res.status).toBe(403);
		expect(res.body.OK).toBe(false);
		expect(res.body.message).toBe('Invalid credential');
	});

	it('should return 403 if phone is invalid', async () => {
		const res = await request(app).post('/caller/validateCall').send({
			phone: '+33334567903',
			pinCode: '1234',
			area: areaId,
			satisfaction: 'Finished',
			status: false,
			phoneNumber: '+33334567902',
			comment: 'comment'
		});
		expect(res.status).toBe(403);
		expect(res.body.OK).toBe(false);
		expect(res.body.message).toBe('Invalid credential');
	});

	it('should return 404 if client is not found', async () => {
		const res = await request(app).post('/caller/validateCall').send({
			phone: '+33334567901',
			pinCode: '1234',
			area: areaId,
			satisfaction: 'Finished',
			status: false,
			phoneNumber: '+33334567903',
			comment: 'comment'
		});
		expect(res.status).toBe(404);
		expect(res.body.OK).toBe(false);
		expect(res.body.message).toBe('Client not found');
	});

	it('should return 404 if campaign is not found', async () => {
		const areaId = (
			await Area.create({
				name: 'validateCall2',
				password: 'password',
				campaignList: [],
				adminPassword: 'adminPassword'
			})
		)._id;
		const caller = await Caller.create({
			name: 'validateCallCaller2',
			phone: '+33334567904',
			pinCode: '1234',
			area: areaId
		});
		const res = await request(app).post('/caller/validateCall').send({
			phone: caller.phone,
			pinCode: caller.pinCode,
			area: areaId,
			satisfaction: 'Finished',
			status: false,
			phoneNumber: '+33334567904',
			comment: 'comment'
		});
		expect(res.status).toBe(404);
		expect(res.body.OK).toBe(false);
		expect(res.body.message).toBe('Campaign not found');
	});

	it('should return 404 if client is not found', async () => {
		const res = await request(app).post('/caller/validateCall').send({
			phone: '+33334567901',
			pinCode: '1234',
			area: areaId,
			satisfaction: 'Finished',
			status: false,
			phoneNumber: '+33334567903',
			comment: 'comment'
		});
		expect(res.status).toBe(404);
		expect(res.body.OK).toBe(false);
		expect(res.body.message).toBe('Client not found');
	});

	it('should return 403 if dont call this client', async () => {
		const ClientId = (
			await Client.create({
				name: 'validateCallClient2',
				phone: '+33334567905',
				campaigns: [campaignId]
			})
		)._id;

		const res = await request(app).post('/caller/validateCall').send({
			phone: '+33334567901',
			pinCode: '1234',
			area: areaId,
			satisfaction: 'Finished',
			status: false,
			phoneNumber: '+33334567905',
			comment: 'comment'
		});
		expect(res.status).toBe(403);
		expect(res.body.OK).toBe(false);
		expect(res.body.message).toBe('you dont call this client');
	});

	it('should return 200 if all is ok', async () => {
		const res = await request(app).post('/caller/validateCall').send({
			phone: '+33334567901',
			pinCode: '1234',
			area: areaId,
			satisfaction: 'Finished',
			status: false,
			phoneNumber: '+33334567902',
			comment: 'comment'
		});
		expect(res.status).toBe(200);
		expect(res.body.OK).toBe(true);
	});
});
