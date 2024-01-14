import mongoose from 'mongoose';
import request from 'supertest';
import { Caller } from '../Models/Caller';

const req = request('http://localhost:7000');

beforeAll(async () => {
	await mongoose.connect(process.env.URI ?? '');
	await Caller.deleteOne({ name: 'testloginCaller' });
	await new Caller({ name: 'testloginCaller', phone: '+33123456789', pinCode: '1234' }).save();
	return true;
});

afterAll(async () => {
	await Caller.deleteOne({ name: 'testloginCaller' });
	return true;
});

describe('POST /api/login', () => {
	it('Should return a 400 if request body is not an object', async () => {
		const res = await req.post('/api/login');
		expect(res.body.message).toEqual('Missing parameters');
		expect(res.body.OK).toEqual(false);
		expect(res.status).toEqual(400);
	});

	it('Should return a 400 if request body dont have pin', async () => {
		const res = await req.post('/api/login').send({ phone: '+33123456789' });
		expect(res.body.message).toEqual('Missing parameters');
		expect(res.status).toEqual(400);
		expect(res.body.OK).toEqual(false);
	});

	it('Should return a 400 if request body dont have phone', async () => {
		const res = await req.post('/api/login').send({ pin: '1234' });
		expect(res.body.message).toEqual('Missing parameters');
		expect(res.status).toEqual(400);
		expect(res.body.OK).toEqual(false);
	});

	it('Should return a 400 if request body phone is not a string', async () => {
		const res = await req.post('/api/login').send({ phone: 123, pin: '1234' });
		expect(res.body.message).toEqual('Missing parameters');
		expect(res.status).toEqual(400);
		expect(res.body.OK).toEqual(false);
	});

	it('Should return a 400 if request body pin is not a string', async () => {
		const res = await req.post('/api/login').send({ phone: '+33123456789', pin: 1234 });
		expect(res.body.message).toEqual('Missing parameters');
		expect(res.status).toEqual(400);
		expect(res.body.OK).toEqual(false);
	});

	//phone Number
	it('Should return a 400 if request body phone number is invalid', async () => {
		const res = await req.post('/api/login').send({ phone: '123', pin: '1234' });
		expect(res.body.message).toEqual('Invalid phone number');
		expect(res.status).toEqual(400);
		expect(res.body.OK).toEqual(false);
	});

	it('Should return a 400 if request body phone number length is less than 10', async () => {
		const res = await req.post('/api/login').send({ phone: '+3312345678', pin: '1234' });
		expect(res.body.message).toEqual('Invalid phone number');
		expect(res.status).toEqual(400);
		expect(res.body.OK).toEqual(false);
	});

	it('Should return a 400 if phone number is not in database', async () => {
		const res = await req.post('/api/login').send({ phone: '+33123456788', pin: '1234' });
		expect(res.body.message).toEqual('Invalid credentials');
		expect(res.status).toEqual(400);
		expect(res.body.OK).toEqual(false);
	});

	it('Should return a 400 if pin is not in database', async () => {
		const res = await req.post('/api/login').send({ phone: '+33123456789', pin: '1235' });
		expect(res.body.message).toEqual('Invalid credentials');
		expect(res.status).toEqual(400);
		expect(res.body.OK).toEqual(false);
	});

	it('should return a 200 if phone number and pin are in database', async () => {
		const res = await req.post('/api/login').send({ phone: '+33123456789', pin: '1234' });
		expect(res.body.message).toEqual('Logged in');
		expect(res.status).toEqual(200);
		expect(res.body.OK).toEqual(true);
	});
});
