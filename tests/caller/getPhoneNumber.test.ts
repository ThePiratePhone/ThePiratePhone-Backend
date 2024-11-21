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
		name: 'getPhoneNumbertest',
		password: 'password',
		campaignList: [],
		adminPassword: 'adminPassword'
	});
	areaId = (await Area.findOne({ name: 'getPhoneNumbertest' }))?._id;
	await Campaign.create({
		name: 'getPhoneNumbertest',
		script: 'getPhoneNumbertest',
		active: true,
		area: areaId,

		status: [
			{ name: 'À rappeler', toRecall: true },
			{ name: 'À retirer', toRecall: false }
		],

		password: 'password'
	});
	campaignId = (await Campaign.findOne({ name: 'getPhoneNumbertest' }))?._id;
	await Caller.create({
		name: 'getPhoneNumbertest',
		phone: '+33734567890',
		pinCode: '1234',
		area: areaId,
		campaigns: campaignId
	});
	await Client.create({
		name: 'getPhoneNumber',
		firstname: 'test',
		phone: '+33712457836',
		area: areaId,
		campaigns: [campaignId]
	});
});

afterAll(async () => {
	await mongoose.connection.close();
});

describe('post on /caller/getPhoneNumber', () => {
	it('should return 400 if phone number is invalid', async () => {
		const res = await request(app)
			.post('/caller/getPhoneNumber')
			.send({ phone: 'invalid', pinCode: '1234', area: areaId });
		expect(res.status).toBe(400);
		expect(res.body).toEqual({ message: 'Invalid phone number', OK: false });
	});

	it('should return 404 if campaign not found', async () => {
		const res = await request(app)
			.post('/caller/getPhoneNumber')
			.send({ phone: '+33734567890', pinCode: '1234', area: new mongoose.Types.ObjectId() });
		expect(res.status).toBe(404);
		expect(res.body).toEqual({ message: 'Campaign not found or not active', OK: false });
	});

	it('should return 403 if call is not permited', async () => {
		await Area.create({
			name: 'getPhoneNumber3',
			password: 'password',
			campaignList: [],
			adminPassword: 'adminPassword'
		});
		const areaId = (await Area.findOne({ name: 'getPhoneNumber3' }))?._id;
		await Campaign.create({
			name: 'getPhoneNumber3',
			script: 'getPhoneNumber3',
			active: true,
			area: areaId,
			status: [
				{ name: 'À rappeler', toRecall: true },
				{ name: 'À retirer', toRecall: false }
			],
			password: 'password',
			callPermited: false
		});
		await Caller.create({
			name: 'getPhoneNumber3',
			phone: '+33734567892',
			pinCode: '1234',
			area: areaId,
			campaigns: (await Campaign.findOne({ name: 'getPhoneNumber3' }))?.id
		});

		const res = await request(app)
			.post('/caller/getPhoneNumber')
			.send({ phone: '+33734567892', pinCode: '1234', area: areaId });
		expect(res.status).toBe(403);
		expect(res.body).toEqual({ message: 'Call not permited', OK: false });
	});

	it('should return 200 if alredy in call', async () => {
		const clientId = (await Client.findOne({ phone: '+33712457836' }))?._id;
		await Area.create({
			name: 'getPhoneNumber4',
			password: 'password',
			campaignList: [],
			adminPassword: 'adminPassword'
		});
		const areaId = (await Area.findOne({ name: 'getPhoneNumber4' }))?._id;
		await Campaign.create({
			name: 'getPhoneNumber4',
			script: 'getPhoneNumber4',
			active: true,
			area: areaId,
			status: [
				{ name: 'À rappeler', toRecall: true },
				{ name: 'À retirer', toRecall: false }
			],
			password: 'password',
			callPermited: true
		});
		const campaignId = (await Campaign.findOne({ name: 'getPhoneNumber4' }))?.id;
		await Caller.create({
			name: 'getPhoneNumber4',
			phone: '+33734567893',
			pinCode: '1234',
			area: areaId,
			campaigns: campaignId
		});
		await Call.create({
			caller: (await Caller.findOne({ phone: '+33734567893' }))?._id,
			client: clientId,
			campaign: campaignId,
			satisfaction: 'Finished',
			status: true,
			area: areaId,
			timeInCall: 1000,
			comment: 'comment'
		});
		await Call.create({
			caller: (await Caller.findOne({ phone: '+33734567893' }))?._id,
			client: clientId,
			campaign: campaignId,
			satisfaction: 'In progress',
			status: true,
			area: areaId
		});
		const res = await request(app)
			.post('/caller/getPhoneNumber')
			.send({ phone: '+33734567893', pinCode: '1234', area: areaId });
		expect(res.status).toBe(200);
		//to match for no test id and start
		expect(res.body).toMatchObject({
			message: 'Client to call',
			OK: true,
			client: {
				_id: clientId?.toString(),
				name: 'getPhoneNumber',
				firstname: 'test',
				phone: '+33712457836'
			},
			callHistory: [
				{
					comment: 'comment',
					satisfaction: 'Finished',
					status: true
				}
			],
			script: 'getPhoneNumber4',
			status: [
				{ name: 'À rappeler', toRecall: true },
				{ name: 'À retirer', toRecall: false }
			]
		});
	});

	it('should return 404 if no client to call', async () => {
		const res = await request(app)
			.post('/caller/getPhoneNumber')
			.send({ phone: '+33734567890', pinCode: '1234', area: areaId });
		expect(res.status).toBe(404);
		expect(res.body).toEqual({ message: 'No client to call', OK: false });
	});

	it('should return 404 if client is call to recently', async () => {
		await Client.create({
			name: 'getPhoneNumber2',
			firstname: 'test',
			phone: '+33712457837',
			area: areaId,
			campaigns: [campaignId]
		});
		await Caller.create({
			name: 'getPhoneNumber5',
			phone: '+33734567894',
			pinCode: '1234',
			area: areaId,
			campaigns: campaignId
		});
		await Call.create({
			caller: (await Caller.findOne({ phone: '+33734567894' }))?._id,
			client: (await Client.findOne({ phone: '+33712457837' }))?._id,
			campaign: campaignId,
			satisfaction: 'Finished',
			status: true,
			area: areaId,
			duration: 1000,
			start: new Date()
		});
		const res = await request(app)
			.post('/caller/getPhoneNumber')
			.send({ phone: '+33734567890', pinCode: '1234', area: areaId });
		expect(res.status).toBe(404);
		expect(res.body).toEqual({ message: 'No client to call', OK: false });
	});

	it('should return 200 for recal client', async () => {
		await Client.create({
			name: 'getPhoneNumber3',
			firstname: 'test',
			phone: '+33712457838',
			area: areaId,
			campaigns: [campaignId]
		});
		await Caller.create({
			name: 'getPhoneNumber6',
			phone: '+33734567895',
			pinCode: '1234',
			area: areaId,
			campaigns: campaignId
		});
		await Call.create({
			caller: (await Caller.findOne({ phone: '+33734567895' }))?._id,
			client: (await Client.findOne({ phone: '+33712457838' }))?._id,
			campaign: campaignId,
			satisfaction: 'Finished',
			status: true,
			area: areaId,
			duration: 1000,
			start: new Date(Date.now() - 10_800_001)
		});
		const res = await request(app)
			.post('/caller/getPhoneNumber')
			.send({ phone: '+33734567890', pinCode: '1234', area: areaId });
		expect(res.status).toBe(200);
		expect(res.body).toMatchObject({
			message: 'Client to call',
			OK: true,
			client: {
				name: 'getPhoneNumber3',
				firstname: 'test',
				phone: '+33712457838'
			}
		});
		await Client.deleteMany({});
		await Call.deleteMany({});
	});

	it('should return 404 if client is call to much', async () => {
		await Client.create({
			name: 'getPhoneNumber4',
			firstname: 'test',
			phone: '+33712457839',
			area: areaId,
			campaigns: [campaignId]
		});
		await Caller.create({
			name: 'getPhoneNumber7',
			phone: '+33734567896',
			pinCode: '1234',
			area: areaId,
			campaigns: campaignId
		});
		await Call.create({
			caller: (await Caller.findOne({ phone: '+33734567896' }))?._id,
			client: (await Client.findOne({ phone: '+33712457839' }))?._id,
			campaign: campaignId,
			satisfaction: 'Finished',
			status: true,
			area: areaId,
			duration: 1000,
			start: new Date(Date.now() - 10_800_001)
		});
		await Call.create({
			caller: (await Caller.findOne({ phone: '+33734567896' }))?._id,
			client: (await Client.findOne({ phone: '+33712457839' }))?._id,
			campaign: campaignId,
			satisfaction: 'Finished',
			status: true,
			area: areaId,
			duration: 1000,
			start: new Date(Date.now() - 10_800_001)
		});
		await Call.create({
			caller: (await Caller.findOne({ phone: '+33734567896' }))?._id,
			client: (await Client.findOne({ phone: '+33712457839' }))?._id,
			campaign: campaignId,
			satisfaction: 'Finished',
			status: true,
			area: areaId,
			duration: 1000,
			start: new Date(Date.now() - 10_800_001)
		});
		await Call.create({
			caller: (await Caller.findOne({ phone: '+33734567896' }))?._id,
			client: (await Client.findOne({ phone: '+33712457839' }))?._id,
			campaign: campaignId,
			satisfaction: 'Finished',
			status: true,
			area: areaId,
			duration: 1000,
			start: new Date(Date.now() - 10_800_001)
		});
		const res = await request(app).post('/caller/getPhoneNumber').send({
			phone: '+33734567890',
			pinCode: '1234',
			area: areaId
		});
		expect(res.status).toBe(404);
		expect(res.body).toEqual({ message: 'No client to call', OK: false });
	});

	it('should return 404 if client is deleted', async () => {
		await Client.create({
			name: 'getPhoneNumber5',
			firstname: 'test',
			phone: '+33712457840',
			area: areaId,
			campaigns: [campaignId],
			delete: true
		});
		await Caller.create({
			name: 'getPhoneNumber8',
			phone: '+33734567897',
			pinCode: '1234',
			area: areaId,
			campaigns: campaignId
		});
		await Call.create({
			caller: (await Caller.findOne({ phone: '+33734567897' }))?._id,
			client: (await Client.findOne({ phone: '+33712457840' }))?._id,
			campaign: campaignId,
			satisfaction: 'Finished',
			status: true,
			area: areaId,
			duration: 1000,
			start: new Date(Date.now() - 10_800_001)
		});
		await Client.deleteMany({});
		const res = await request(app).post('/caller/getPhoneNumber').send({
			phone: '+33734567890',
			pinCode: '1234',
			area: areaId
		});
		expect(res.status).toBe(404);
		expect(res.body).toEqual({ message: 'No client to call', OK: false });
	});

	it('should work', async () => {
		await Client.create({
			name: 'getPhoneNumber6',
			firstname: 'test',
			phone: '+33712457841',
			area: areaId,
			campaigns: [campaignId]
		});
		await Caller.create({
			name: 'getPhoneNumber9',
			phone: '+33734567898',
			pinCode: '1234',
			area: areaId,
			campaigns: campaignId
		});
		const res = await request(app).post('/caller/getPhoneNumber').send({
			phone: '+33734567890',
			pinCode: '1234',
			area: areaId
		});
		expect(res.status).toBe(200);
		expect(res.body).toMatchObject({
			message: 'Client to call',
			OK: true,
			client: {
				name: 'getPhoneNumber6',
				firstname: 'test',
				phone: '+33712457841'
			}
		});
	});
});
