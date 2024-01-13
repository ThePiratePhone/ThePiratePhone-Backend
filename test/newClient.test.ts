import mongoose from 'mongoose';
import request from 'supertest';
import { Client } from '../Models/Client';

const req = request('http://localhost:7000');

beforeAll(async () => {
	await mongoose.connect(process.env.URI ?? '');
	await Client.deleteOne({ name: 'testCreateClient' });
	return true;
});

afterEach(async () => {
	await Client.deleteOne({ name: 'testCreateClient' });
	return true;
});

describe('POST /api/NewUser', () => {
	it('Should return a 400 if request body is not an object', async () => {
		const res = await req.post('/api/NewUser');
		expect(res.body.message).toEqual('Missing parameters');
		expect(res.body.OK).toEqual(false);
		expect(res.status).toEqual(400);
	});

	it('Should return a 400 if request body dont have name', async () => {
		const res = await req.post('/api/NewUser').send({ phone: '0123456789', adminCode: process.env.ADMIN_PASSWORD });
		expect(res.body.message).toEqual('Missing parameters');
		expect(res.status).toEqual(400);
		expect(res.body.OK).toEqual(false);
	});

	it('Should return a 400 if request body dont have phone', async () => {
		const res = await req
			.post('/api/NewUser')
			.send({ name: 'testCreateClient', adminCode: process.env.ADMIN_PASSWORD });
		expect(res.body.message).toEqual('Missing parameters');
		expect(res.status).toEqual(400);
		expect(res.body.OK).toEqual(false);
	});

	it('Should return a 400 if request body dont have adminCode', async () => {
		const res = await req.post('/api/NewUser').send({ name: 'testCreateClient', phone: '0123456789' });
		expect(res.body.message).toEqual('Missing parameters');
		expect(res.status).toEqual(400);
		expect(res.body.OK).toEqual(false);
	});

	it('Should return a 400 if request body name is not a string', async () => {
		const res = await req
			.post('/api/NewUser')
			.send({ name: 123, phone: '0123456789', adminCode: process.env.ADMIN_PASSWORD });
		expect(res.body.message).toEqual('Invalid parameters');
		expect(res.status).toEqual(400);
		expect(res.body.OK).toEqual(false);
	});

	//phone Number
	it('Should return a 400 if request body phone number is invalid', async () => {
		const res = await req
			.post('/api/NewUser')
			.send({ name: 'testCreateClient', phone: '123', adminCode: process.env.ADMIN_PASSWORD });
		expect(res.body.message).toEqual('Invalid phone number');
		expect(res.status).toEqual(400);
		expect(res.body.OK).toEqual(false);
	});

	it('Should return a 400 if request body phone number length is less than 10', async () => {
		const res = await req
			.post('/api/NewUser')
			.send({ name: 'testCreateClient', phone: '123456789', adminCode: process.env.ADMIN_PASSWORD });
		expect(res.body.message).toEqual('Invalid phone number');
		expect(res.status).toEqual(400);
		expect(res.body.OK).toEqual(false);
	});

	it('Should return a 201 if phone number is french', async () => {
		const res = await req
			.post('/api/NewUser')
			.send({ name: 'testCreateClient', phone: '+33234567891', adminCode: process.env.ADMIN_PASSWORD });
		expect(res.body.message).toEqual('Client created');
		expect(res.status).toEqual(201);
		expect(res.body.OK).toEqual(true);
	});

	it('Should return a 400 if request body phone number is superior to 13', async () => {
		const res = await req
			.post('/api/NewUser')
			.send({ name: 'testCreateClient', phone: '+3312345678910', adminCode: process.env.ADMIN_PASSWORD });
		expect(res.body.message).toEqual('Invalid phone number');
		expect(res.status).toEqual(400);
		expect(res.body.OK).toEqual(false);
	});
	//end phone number

	it('Should return a 201 if request body is correct', async () => {
		await Client.deleteOne({ name: 'testCreateClient' });
		const res = await req
			.post('/api/NewUser')
			.send({ name: 'testCreateClient', phone: '0123456789', adminCode: process.env.ADMIN_PASSWORD });
		expect(res.body.message).toEqual('Client created');
		expect(res.status).toEqual(201);
		expect(res.body.OK).toEqual(true);
	});

	it('Should return a 400 if client already exists', async () => {
		await Client.deleteOne({ name: 'testCreateClient' });
		const client = new Client({
			name: 'testCreateClient',
			phone: '+33123456789',
			status: 'not called',
			adminCode: process.env.ADMIN_PASSWORD
		});
		await client.save();

		const res = await req
			.post('/api/NewUser')
			.send({ name: 'testCreateClient', phone: '0123456789', adminCode: process.env.ADMIN_PASSWORD });
		expect(res.body.message).toEqual('Client already exists');
		expect(res.status).toEqual(400);
		expect(res.body.OK).toEqual(false);
	});
});
