import mongoose from 'mongoose';
import request from 'supertest';
import { Campaign } from '../Models/campaign';

const req = request('http://localhost:7000');

beforeAll(async () => {
	await mongoose.connect(process.env.URI ?? '');
});

afterEach(async () => {
	await Campaign.deleteOne({ name: 'testCreateCampaign' });
});

describe('POST /api/NewCampaign', () => {
	it('Should return a 400 if request body is not an object', async () => {
		const res = await req.post('/api/NewCampaign');
		expect(res.body.message).toEqual('Missing parameters');
		expect(res.body.OK).toEqual(false);
		expect(res.status).toEqual(400);
	});

	it('Should return a 400 if request body dont have name', async () => {
		const res = await req
			.post('/api/NewCampaign')
			.send({ dateStart: '2021-01-01', dateEnd: '2021-01-02', script: 'test' });
		expect(res.status).toEqual(400);
		expect(res.body.message).toEqual('Missing parameters');
		expect(res.body.OK).toEqual(false);
	});

	it('Should return a 400 if request body dont have dateStart', async () => {
		const res = await req
			.post('/api/NewCampaign')
			.send({ name: 'testCreateCampaign', dateEnd: '2021-01-02', script: 'test' });
		expect(res.status).toEqual(400);
		expect(res.body.OK).toEqual(false);
		expect(res.body.message).toEqual('Missing parameters');
	});

	it('Should return a 400 if request body dont have dateEnd', async () => {
		const res = await req
			.post('/api/NewCampaign')
			.send({ name: 'testCreateCampaign', dateStart: '2021-01-01', script: 'test' });
		expect(res.status).toEqual(400);
		expect(res.body.OK).toEqual(false);
		expect(res.body.message).toEqual('Missing parameters');
	});

	it('Should return a 400 if request body dont have script', async () => {
		const res = await req
			.post('/api/NewCampaign')
			.send({ name: 'testCreateCampaign', dateStart: '2021-01-01', dateEnd: '2021-01-02' });
		expect(res.status).toEqual(400);
		expect(res.body.OK).toEqual(false);
		expect(res.body.message).toEqual('Missing parameters');
	});

	it('Should return a 400 if request body name is not a string', async () => {
		const res = await req
			.post('/api/NewCampaign')
			.send({ name: 123, dateStart: '2021-01-01', dateEnd: '2021-01-02', script: 'test' });
		expect(res.status).toEqual(400);
		expect(res.body.OK).toEqual(false);
		expect(res.body.message).toEqual('Invalid parameters');
	});

	it('Should return a 400 if request body dateStart is not a date', async () => {
		const res = await req
			.post('/api/NewCampaign')
			.send({ name: 'testCreateCampaign', dateStart: 'hello', dateEnd: '2021-01-02', script: 'test' });
		expect(res.status).toEqual(400);
		expect(res.body.OK).toEqual(false);
		expect(res.body.message).toEqual('Invalid parameters');
	});

	it('Should return a 400 if request body dateEnd is not a date', async () => {
		const res = await req
			.post('/api/NewCampaign')
			.send({ name: 'testCreateCampaign', dateStart: '2021-01-01', dateEnd: 'hello', script: 'test' });
		expect(res.status).toEqual(400);
		expect(res.body.OK).toEqual(false);
		expect(res.body.message).toEqual('Invalid parameters');
	});

	it('Should return a 400 if request body script is not a string', async () => {
		const res = await req
			.post('/api/NewCampaign')
			.send({ name: 'testCreateCampaign', dateStart: '2021-01-01', dateEnd: '2021-01-02', script: 123 });
		expect(res.status).toEqual(400);
		expect(res.body.OK).toEqual(false);
		expect(res.body.message).toEqual('Invalid parameters');
	});

	it('Should return a 201 if request body is correct', async () => {
		const res = await req
			.post('/api/NewCampaign')
			.send({ name: 'testCreateCampaign', dateStart: '2021-01-01', dateEnd: '2021-01-02', script: 'test' });
		expect(res.status).toEqual(201);
		expect(res.body.OK).toEqual(true);
		expect(res.body.message).toEqual('Campaign created');
	});

	it('should return a 400 if campaign already exists', async () => {
		const campaign = new Campaign({
			name: 'testCreateCampaign',
			dateStart: new Date('2021-01-01'),
			dateEnd: new Date('2021-01-02'),
			script: new Array<String>().push('test')
		});
		await campaign.save();
		const res2 = await req
			.post('/api/NewCampaign')
			.send({ name: 'testCreateCampaign', dateStart: '2021-01-01', dateEnd: '2021-01-02', script: 'test' });
		expect(res2.status).toEqual(400);
		expect(res2.body.OK).toEqual(false);
		expect(res2.body.message).toEqual('Campaign already exists');
	});
});
