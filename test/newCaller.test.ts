import mongoose from 'mongoose';
import request from 'supertest';
import { Caller } from '../Models/Caller';

const req = request('http://localhost:7000');

beforeAll(async () => {
	await mongoose.connect(process.env.URI ?? '');
	await Caller.deleteOne({ name: 'testCreateCaller' });
	await Caller.deleteOne({ name: 'testCreateCallerDuplicate' });
	return true;
});

afterEach(async () => {
	await Caller.deleteOne({ name: 'testCreateCaller' });
});

describe('POST /api/NewCaller', () => {
	it('Should return a 400 if request body is not an object', async () => {
		const res = await req.post('/api/NewCaller');
		expect(res.body.message).toEqual('Missing parameters');
		expect(res.body.OK).toEqual(false);
		expect(res.status).toEqual(400);
	});

	it('Should return a 400 if request body dont have name', async () => {
		const res = await req
			.post('/api/NewCaller')
			.send({ phone: '123456789', pinCode: '1234', adminCode: process.env.ADMIN_PASSWORD });
		expect(res.status).toEqual(400);
		expect(res.body.message).toEqual('Missing parameters');
		expect(res.body.OK).toEqual(false);
	});

	it('Should return a 400 if request body dont have phone', async () => {
		const res = await req
			.post('/api/NewCaller')
			.send({ name: 'testCreateCaller', pinCode: '1234', adminCode: process.env.ADMIN_PASSWORD });
		expect(res.status).toEqual(400);
		expect(res.body.OK).toEqual(false);
		expect(res.body.message).toEqual('Missing parameters');
	});

	it('Should return a 400 if request body dont have pinCode', async () => {
		const res = await req
			.post('/api/NewCaller')
			.send({ name: 'testCreateCaller', phone: '123456789', adminCode: process.env.ADMIN_PASSWORD });
		expect(res.status).toEqual(400);
		expect(res.body.OK).toEqual(false);
		expect(res.body.message).toEqual('Missing parameters');
	});

	it('Should return a 400 if request body dont have adminCode', async () => {
		const res = await req
			.post('/api/NewCaller')
			.send({ name: 'testCreateCaller', phone: '123456789', pinCode: '1234' });
		expect(res.status).toEqual(400);
		expect(res.body.OK).toEqual(false);
		expect(res.body.message).toEqual('Missing parameters');
	});

	it('Should return a 400 if request body name is not a string', async () => {
		const res = await req
			.post('/api/NewCaller')
			.send({ name: 123, phone: '123456789', pinCode: '1234', adminCode: process.env.ADMIN_PASSWORD });
		expect(res.status).toEqual(400);
		expect(res.body.OK).toEqual(false);
		expect(res.body.message).toEqual('Invalid parameters');
	});

	it('Should return a 400 if request body phone is not a string', async () => {
		const res = await req
			.post('/api/NewCaller')
			.send({ name: 'testCreateCaller', phone: 123, pinCode: '1234', adminCode: process.env.ADMIN_PASSWORD });
		expect(res.status).toEqual(400);
		expect(res.body.OK).toEqual(false);
		expect(res.body.message).toEqual('Invalid parameters');
	});

	it('Should return a 400 if request body pinCode is not a string', async () => {
		const res = await req.post('/api/NewCaller').send({
			name: 'testCreateCaller',
			phone: '123456789',
			pinCode: 1234,
			adminCode: process.env.ADMIN_PASSWORD
		});
		expect(res.status).toEqual(400);
		expect(res.body.OK).toEqual(false);
		expect(res.body.message).toEqual('Invalid parameters');
	});

	it('Should return a 400 if request body pinCode is not 4 characters long', async () => {
		const res = await req.post('/api/NewCaller').send({
			name: 'testCreateCaller',
			phone: '123456789',
			pinCode: '123',
			adminCode: process.env.ADMIN_PASSWORD
		});
		expect(res.status).toEqual(400);
		expect(res.body.OK).toEqual(false);
		expect(res.body.message).toEqual('Invalid parameters');
	});

	//phone Number
	it('Should return a 400 if request body phone number is invalid', async () => {
		const res = await req
			.post('/api/NewCaller')
			.send({ name: 'testCreateCaller', phone: '123', pinCode: '1234', adminCode: process.env.ADMIN_PASSWORD });
		expect(res.status).toEqual(400);
		expect(res.body.OK).toEqual(false);
		expect(res.body.message).toEqual('Invalid phone number');
	});

	it('Should return a 400 if request body phone number length is less than 10', async () => {
		const res = await req.post('/api/NewCaller').send({
			name: 'testCreateCaller',
			phone: '123456789',
			pinCode: '1234',
			adminCode: process.env.ADMIN_PASSWORD
		});
		expect(res.status).toEqual(400);
		expect(res.body.OK).toEqual(false);
		expect(res.body.message).toEqual('Invalid phone number');
	});

	it('Should return a 201 if phone number is french', async () => {
		const res = await req.post('/api/NewCaller').send({
			name: 'testCreateCaller',
			phone: '+33234567891',
			pinCode: '1234',
			adminCode: process.env.ADMIN_PASSWORD
		});
		expect(res.body.message).toEqual('Caller created');
		expect(res.status).toEqual(201);
		expect(res.body.OK).toEqual(true);
	});

	it('Should return a 400 if request body phone number is superior to 13', async () => {
		const res = await req.post('/api/NewCaller').send({
			name: 'testCreateCaller',
			phone: '+3312345678910',
			pinCode: '1234',
			adminCode: process.env.ADMIN_PASSWORD
		});
		expect(res.status).toEqual(400);
		expect(res.body.OK).toEqual(false);
		expect(res.body.message).toEqual('Invalid phone number');
	});
	//end phone number

	it('Should return a 400 if request name is already in use', async () => {
		const caller = new Caller({
			name: 'testCreateCallerDuplicate',
			phone: '+33123456789',
			pinCode: '1234',
			timeInCall: new Map<String, Number>()
		});
		await caller.save();
		const res = await req.post('/api/NewCaller').send({
			name: 'testCreateCallerDuplicate',
			phone: '0123456789',
			pinCode: '1234',
			adminCode: process.env.ADMIN_PASSWORD
		});
		expect(res.status).toEqual(400);
		expect(res.body.OK).toEqual(false);
		expect(res.body.message).toEqual('Caller already exists');

		await Caller.deleteOne({ name: 'testCreateCallerDuplicate' });
	});

	it('Should return a 400 if request phone is already in use', async () => {
		const caller = new Caller({
			name: 'testDuplicate2',
			phone: '+33123456789',
			pinCode: '1234',
			timeInCall: new Map<String, Number>()
		});
		await caller.save();
		const res = await req.post('/api/NewCaller').send({
			name: 'testDuplicate3',
			phone: '0123456789',
			pinCode: '1234',
			adminCode: process.env.ADMIN_PASSWORD
		});
		expect(res.status).toEqual(400);
		expect(res.body.OK).toEqual(false);
		expect(res.body.message).toEqual('Caller already exists');

		await Caller.deleteOne({ name: 'testDuplicate2' });
	});

	it('Should return a 201 if request is valid', async () => {
		const res = await req.post('/api/NewCaller').send({
			name: 'testCreateCaller',
			phone: '+33123456789',
			pinCode: '1234',
			adminCode: process.env.ADMIN_PASSWORD
		});
		expect(res.body.message).toEqual('Caller created');
		expect(res.status).toEqual(201);
		expect(res.body.OK).toEqual(true);
	});
});
