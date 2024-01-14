import mongoose from 'mongoose';
import request from 'supertest';
import { Campaign } from '../Models/Campaign';
import { Client } from '../Models/Client';
import { Caller } from '../Models/Caller';

const req = request('http://localhost:7000');

beforeAll(async () => {
	await mongoose.connect(process.env.URI ?? '');
	await Campaign.deleteOne({ name: 'testCampaign' });
	await Client.deleteOne({ name: 'testClient1' });
	await Client.deleteOne({ name: 'testClient2' });
	await Client.deleteOne({ name: 'testClient3' });
	await Caller.deleteOne({ name: 'testCaller' });
	const caller = await Caller.create({ name: 'testCaller', phone: '+33123456789', pinCode: '1234' });
	const client1 = await Client.create({
		name: 'testClient1',
		phone: '+33012345678',
		status: 'called',
		caller: caller._id,
		startCall: new Date('2021-01-01'),
		endCall: new Date()
	});
	const client2 = await Client.create({
		name: 'testClient2',
		phone: '+33234567891',
		status: 'inprogress',
		caller: caller._id,
		startCall: new Date()
	});
	const client3 = await Client.create({ name: 'testClient3', phone: '+33123456789', status: 'not called' });
	await Campaign.create({
		name: 'testCampaign',
		createdAt: new Date(),
		dateEnd: new Date('2030-01-01'),
		dateStart: new Date(),
		script: ['test'],
		userList: [client1._id, client2._id, client3._id],
		callerList: [caller._id]
	});
	return true;
});

afterAll(async () => {
	await Campaign.deleteOne({ name: 'testCampaign' });
	await Client.deleteOne({ name: 'testClient1' });
	await Client.deleteOne({ name: 'testClient2' });
	await Client.deleteOne({ name: 'testClient3' });
	await Caller.deleteOne({ name: 'testCaller' });
	return true;
});

describe('POST /api/getUserNotCalled', () => {
	it('Should return a 400 if request body is not an object', async () => {
		const res = await req.post('/api/getUserNotCalled');
		expect(res.body.message).toEqual('Missing parameters');
		expect(res.body.OK).toEqual(false);
		expect(res.status).toEqual(400);
	});

	it('should return a 400 if request body dont have phone', async () => {
		const res = await req.post('/api/getUserNotCalled').send({
			campaingNane: 'testCampaign',
			pin: '1234'
		});
		expect(res.status).toEqual(400);
		expect(res.body.OK).toEqual(false);
		expect(res.body.message).toEqual('Missing parameters');
	});

	it('should return a 400 if request body dont have campaingNane', async () => {
		const res = await req.post('/api/getUserNotCalled').send({
			phone: '+33123456789',
			pin: '1234'
		});
		expect(res.status).toEqual(400);
		expect(res.body.OK).toEqual(false);
		expect(res.body.message).toEqual('Missing parameters');
	});

	it('should return a 400 if request body dont have pin', async () => {
		const res = await req.post('/api/getUserNotCalled').send({
			phone: '+33123456789',
			campaingNane: 'testCampaign'
		});
		expect(res.status).toEqual(400);
		expect(res.body.OK).toEqual(false);
		expect(res.body.message).toEqual('Missing parameters');
	});

	it('should return a 400 if request body have a invalid phone', async () => {
		const res = await req.post('/api/getUserNotCalled').send({
			phone: '0223456789',
			campaingNane: 'testCampaign',
			pin: '1234'
		});
		expect(res.status).toEqual(400);
		expect(res.body.OK).toEqual(false);
		expect(res.body.message).toEqual('Invalid credentials');
	});

	it('should return a 400 if request body have a invalid campaingNane', async () => {
		const res = await req.post('/api/getUserNotCalled').send({
			phone: '+33123456789',
			campaingNane: 1234,
			pin: '1234'
		});
		expect(res.status).toEqual(400);
		expect(res.body.OK).toEqual(false);
		expect(res.body.message).toEqual('Invalid parameters');
	});

	it('should return a 400 if request body have a invalid pin', async () => {
		const res = await req.post('/api/getUserNotCalled').send({
			phone: '+33123456789',
			campaingNane: 'testCampaign',
			pin: 1234
		});
		expect(res.status).toEqual(400);
		expect(res.body.OK).toEqual(false);
		expect(res.body.message).toEqual('Invalid parameters');
	});

	it('should return a 400 if credentials are invalid', async () => {
		const res = await req.post('/api/getUserNotCalled').send({
			phone: '+33123456789',
			campaingNane: 'testCampaign',
			pin: '12345'
		});
		expect(res.status).toEqual(400);
		expect(res.body.OK).toEqual(false);
		expect(res.body.message).toEqual('Invalid credentials');
	});

	it('should return a 404 if campaing not found', async () => {
		const res = await req.post('/api/getUserNotCalled').send({
			phone: '+33123456789',
			campaingNane: 'testCampaign2',
			pin: '1234'
		});
		expect(res.status).toEqual(404);
		expect(res.body.OK).toEqual(false);
		expect(res.body.message).toEqual('campaing not found');
	});

	it('should return a 404 if no client', async () => {
		await Campaign.findOneAndUpdate({ name: 'testCampaign' }, { userList: [] });
		const res = await req.post('/api/getUserNotCalled').send({
			phone: '+33123456789',
			campaingNane: 'testCampaign',
			pin: '1234'
		});
		expect(res.body.message).toEqual('No client available');
		expect(res.status).toEqual(404);
		expect(res.body.OK).toEqual(false);

		await Campaign.findOneAndUpdate(
			{ name: 'testCampaign' },
			{
				userList: [
					await Client.findOne({ name: 'testClient1' }),
					await Client.findOne({ name: 'testClient2' }),
					await Client.findOne({ name: 'testClient3' })
				]
			}
		);
	});

	it('should return a 404 if no client with status not called', async () => {
		await Campaign.findOneAndUpdate(
			{ name: 'testCampaign' },
			{
				userList: [await Client.findOne({ name: 'testClient1' }), await Client.findOne({ name: 'testClient2' })]
			}
		);
		const res = await req.post('/api/getUserNotCalled').send({
			phone: '+33123456789',
			campaingNane: 'testCampaign',
			pin: '1234'
		});
		expect(res.body.message).toEqual('No client available');
		expect(res.status).toEqual(404);
		expect(res.body.OK).toEqual(false);
		await Campaign.findOneAndUpdate(
			{ name: 'testCampaign' },
			{
				userList: [
					await Client.findOne({ name: 'testClient1' }),
					await Client.findOne({ name: 'testClient2' }),
					await Client.findOne({ name: 'testClient3' })
				]
			}
		);
	});

	it('should return a 200 if request body is valid', async () => {
		const res = await req.post('/api/getUserNotCalled').send({
			phone: '+33123456789',
			campaingNane: 'testCampaign',
			pin: '1234'
		});
		expect(res.status).toEqual(200);
		expect(res.body.OK).toEqual(true);
		expect(res.body.message).toEqual('Client found');
		expect(res.body.data.client.name).toEqual('testClient3');
		expect(res.body.data.client.status).toEqual('inprogress');
		expect(res.body.data.script).toEqual('test');
	});
});
