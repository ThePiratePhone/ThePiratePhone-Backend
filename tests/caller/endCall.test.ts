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
beforeAll(async () => {
	await mongoose.connect(process.env.URITEST ?? '');
	await Caller.deleteMany({});
	await Area.deleteMany({});
	await Campaign.deleteMany({});
	await Call.deleteMany({});
	await Client.deleteMany({});
	await Area.create({
		name: 'changepassordtest',
		password: 'password',
		campaignList: [],
		adminPassword: 'adminPassword'
	});
	areaId = (await Area.findOne({ name: 'changepassordtest' }))?._id;
	await Campaign.create({
		name: 'changepassordtest',
		script: 'changepassordtest',
		active: true,
		area: areaId,

		status: [
			{ name: 'À rappeler', toRecall: true },
			{ name: 'À retirer', toRecall: false }
		],

		password: 'password'
	});
	const campaignId = (await Campaign.findOne({ name: 'changepassordtest' }))?._id;
	await Caller.create({
		name: 'changepassordtest',
		phone: '+33834567890',
		pinCode: '1234',
		area: areaId,
		campaigns: campaignId
	});
	await Client.create({
		name: 'changepassord',
		firstname: 'test',
		phone: '+33712457836',
		area: areaId,
		campaigns: [campaignId]
	});
	await Call.create({
		caller: (await Caller.findOne({ phone: '+33834567890' }))?._id,
		client: (await Client.findOne({ phone: '+33712457836' }))?._id,
		campaign: campaignId,
		satisfaction: 'In progress',
		status: true,
		area: areaId
	});
});

afterAll(async () => {
	await mongoose.connection.close();
});

describe('post on /caller/endCall', () => {
	it('sould return 400 if invalid crential', async () => {
		const res = await request(app).post('/caller/endCall').send({
			phone: '+33834567890',
			pinCode: '1235',
			timeInCall: 1000,
			satisfaction: 'In progress',
			status: true
		});
		expect(res.status).toBe(403);
		expect(res.body).toEqual({ message: 'Invalid credential', OK: false });
	});

	it('sould return 403 if no call in progress', async () => {
		await Caller.create({
			name: 'changepassordtest3',
			phone: '+33834567893',
			pinCode: '1234',
			campaigns: '66c5db7a64953f8138610d98'
		});

		const res = await request(app).post('/caller/endCall').send({
			phone: '+33834567893',
			pinCode: '1234',
			timeInCall: 1000,
			satisfaction: 'Finished',
			status: true
		});
		expect(res.status).toBe(403);
		expect(res.body).toEqual({ message: 'No call in progress', OK: false });
	});

	it('sould return 403 if no call in progress', async () => {
		await Caller.create({
			name: 'changepassordtest2',
			phone: '+33834567892',
			pinCode: '1234',
			campaigns: '66c5db7a64953f8138610d98'
		});

		await Call.create({
			caller: (await Caller.findOne({ phone: '+33834567892' }))?._id,
			client: (await Client.findOne({ phone: '+33712457836' }))?._id,
			campaign: (await Campaign.findOne({ name: 'changepassordtest' }))?._id,
			satisfaction: 'Finished',
			status: true
		});
		const res = await request(app).post('/caller/endCall').send({
			phone: '+33834567892',
			pinCode: '1234',
			timeInCall: 1000,
			satisfaction: 'Finished',
			status: true
		});
		expect(res.status).toBe(403);
		expect(res.body).toEqual({ message: 'No call in progress', OK: false });
	});

	it('sould return 400 if satisfaction is not in campaign', async () => {
		const res = await request(app).post('/caller/endCall').send({
			phone: '+33834567890',
			pinCode: '1234',
			timeInCall: 1000,
			satisfaction: 'not in campaign',
			status: true
		});
		expect(res.status).toBe(400);
		expect(res.body).toMatchObject({
			message: 'satisfaction is not in campaign',
			data: [
				{ name: 'À rappeler', toRecall: true },
				{ name: 'À retirer', toRecall: false }
			],
			OK: false
		});
	});

	it('sould return 500 if invalid campaign in call', async () => {
		await Caller.create({
			name: 'changepassordtest2',
			phone: '+33834567891',
			pinCode: '1234',
			campaigns: '66c5db7a64953f8138610d98'
		});
		await Client.create({
			name: 'changepassord',
			firstname: 'test2',
			phone: '+33712457837',
			campaigns: '66c5db7a64953f8138610d98'
		});
		await Call.create({
			caller: (await Caller.findOne({ phone: '+33834567891' }))?._id,
			client: (await Client.findOne({ phone: '+33712457837' }))?._id,
			campaign: '66c5db7a64953f8138610d98',
			satisfaction: 'In progress',
			status: true
		});

		const res = await request(app).post('/caller/endCall').send({
			phone: '+33834567891',
			pinCode: '1234',
			timeInCall: 1000,
			satisfaction: 'In progress',
			status: true
		});
		expect(res.status).toBe(500);
		expect(res.body).toEqual({ message: 'Invalid campaign in call', OK: false });
	});

	it('sould return 500 if invalid client in call', async () => {
		await Caller.create({
			name: 'changepassordtest3',
			phone: '+33834567894',
			pinCode: '1234',
			campaigns: '66c5db7a64953f8138610d98'
		});
		await Call.create({
			caller: (await Caller.findOne({ phone: '+33834567894' }))?._id,
			client: '66c5db7a64953f8138610d98',
			campaign: (await Campaign.findOne({ name: 'changepassordtest' }))?._id,
			satisfaction: 'In progress',
			status: true
		});
	});

	it('should work if all is good', async () => {
		const res = await request(app).post('/caller/endCall').send({
			phone: '+33834567890',
			pinCode: '1234',
			timeInCall: 1000,
			satisfaction: 'À retirer',
			status: true
		});
		expect(res.status).toBe(200);
		expect(res.body).toEqual({ message: 'Call ended', OK: true });
	});
});
