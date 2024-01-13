import mongoose from 'mongoose';
import request from 'supertest';
import { Campaign } from '../Models/Campaign';
import { Client } from '../Models/Client';

const req = request('http://localhost:7000');

beforeAll(async () => {
	await mongoose.connect(process.env.URI ?? '');
	await Campaign.deleteOne({ name: 'testCampaign' });
	await Client.deleteOne({ name: 'testCampaignClient' });
	await Client.create({ name: 'testCampaignClient', phone: '+33123456789', status: 'not called' });
	return true;
});

afterAll(async () => {
	await Campaign.deleteOne({ name: 'testCampaign' });
	await Client.deleteOne({ name: 'testCampaignClient' });
	return true;
});

beforeEach(async () => {
	await Campaign.deleteOne({ name: 'testCampaign' });
	await Campaign.create({
		name: 'testCampaign',
		createdAt: new Date(),
		dateEnd: new Date(),
		dateStart: new Date(),
		script: ['test'],
		userList: []
	});
	return true;
});

describe('POST /api/addClientcampaign', () => {
	it('Should return a 400 if request body is not an object', async () => {
		const res = await req.post('/api/addClientcampaign');
		expect(res.body.message).toEqual('Missing parameters');
		expect(res.body.OK).toEqual(false);
		expect(res.status).toEqual(400);
	});

	it('should return a 400 if request body dont have phone', async () => {
		const res = await req.post('/api/addClientcampaign').send({
			campaingNane: 'testCampaign',
			adminCode: process.env.ADMIN_PASSWORD
		});
		expect(res.status).toEqual(400);
		expect(res.body.OK).toEqual(false);
		expect(res.body.message).toEqual('Missing parameters');
	});

	it('should return a 400 if request body dont have campaingNane', async () => {
		const res = await req.post('/api/addClientcampaign').send({
			phone: '0123456789',
			adminCode: process.env.ADMIN_PASSWORD
		});
		expect(res.status).toEqual(400);
		expect(res.body.OK).toEqual(false);
		expect(res.body.message).toEqual('Missing parameters');
	});

	it('should return a 400 if request body dont have adminCode', async () => {
		const res = await req.post('/api/addClientcampaign').send({
			phone: '0123456789',
			campaingNane: 'testCampaign'
		});
		expect(res.status).toEqual(400);
		expect(res.body.OK).toEqual(false);
		expect(res.body.message).toEqual('Missing parameters');
	});

	it('should return a 400 if request body phone is not a string', async () => {
		const res = await req.post('/api/addClientcampaign').send({
			phone: 123456789,
			campaingNane: 'testCampaign',
			adminCode: process.env.ADMIN_PASSWORD
		});
		expect(res.status).toEqual(400);
		expect(res.body.OK).toEqual(false);
		expect(res.body.message).toEqual('Invalid parameters');
	});

	it('should return a 400 if request body campaingNane is not a string', async () => {
		const res = await req.post('/api/addClientcampaign').send({
			phone: '0123456789',
			campaingNane: 123,
			adminCode: process.env.ADMIN_PASSWORD
		});
		expect(res.status).toEqual(400);
		expect(res.body.OK).toEqual(false);
		expect(res.body.message).toEqual('Invalid parameters');
	});

	it('should return a 400 if request body adminCode is not a string', async () => {
		const res = await req.post('/api/addClientcampaign').send({
			phone: '0123456789',
			campaingNane: 'testCampaign',
			adminCode: 123
		});
		expect(res.status).toEqual(400);
		expect(res.body.OK).toEqual(false);
		expect(res.body.message).toEqual('Invalid parameters');
	});

	it('should return a 400 if request body phone is not a valid phone number', async () => {
		const res = await req.post('/api/addClientcampaign').send({
			phone: '123456789',
			campaingNane: 'testCampaign',
			adminCode: process.env.ADMIN_PASSWORD
		});
		expect(res.status).toEqual(400);
		expect(res.body.OK).toEqual(false);
		expect(res.body.message).toEqual('Invalid phone number');
	});

	it('should return a 400 if request body adminCode is not the admin code', async () => {
		const res = await req.post('/api/addClientcampaign').send({
			phone: '0123456789',
			campaingNane: 'testCampaign',
			adminCode: '123'
		});
		expect(res.status).toEqual(400);
		expect(res.body.OK).toEqual(false);
		expect(res.body.message).toEqual('Invalid admin code');
	});

	it('should return a 404 if request body phone is not a client', async () => {
		const res = await req.post('/api/addClientcampaign').send({
			phone: '0999999999',
			campaingNane: 'testCampaign',
			adminCode: process.env.ADMIN_PASSWORD
		});
		expect(res.status).toEqual(404);
		expect(res.body.OK).toEqual(false);
		expect(res.body.message).toEqual('Client not found');
	});

	it('should return a 404 if request body campaingNane is not a campaing', async () => {
		const res = await req.post('/api/addClientcampaign').send({
			phone: '0123456789',
			campaingNane: 'testCampaignNotExist',
			adminCode: process.env.ADMIN_PASSWORD
		});
		expect(res.status).toEqual(404);
		expect(res.body.OK).toEqual(false);
		expect(res.body.message).toEqual('Campaing not found');
	});

	it('should return a 400 if request body phone is already in campaing', async () => {
		await req.post('/api/addClientcampaign').send({
			phone: '0123456789',
			campaingNane: 'testCampaign',
			adminCode: process.env.ADMIN_PASSWORD
		});
		const res = await req.post('/api/addClientcampaign').send({
			phone: '0123456789',
			campaingNane: 'testCampaign',
			adminCode: process.env.ADMIN_PASSWORD
		});
		expect(res.status).toEqual(400);
		expect(res.body.OK).toEqual(false);
		expect(res.body.message).toEqual('Client already in campaing');
	});

	it('should return a 200 if request body is valid', async () => {
		const res = await req.post('/api/addClientcampaign').send({
			phone: '0123456789',
			campaingNane: 'testCampaign',
			adminCode: process.env.ADMIN_PASSWORD
		});
		expect(res.status).toEqual(200);
		expect(res.body.OK).toEqual(true);
		expect(res.body.message).toEqual('Client added to campaing');
	});
});
