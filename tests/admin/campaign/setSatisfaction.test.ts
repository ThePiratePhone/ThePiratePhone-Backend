import dotenv from 'dotenv';
import mongoose, { Types } from 'mongoose';
import request from 'supertest';
import app from '../../../index';
import { Area } from '../../../Models/Area';
import { Campaign } from '../../../Models/Campaign';

dotenv.config({ path: '.env' });

let areaId: mongoose.Types.ObjectId | undefined;
let CampaignId: mongoose.Types.ObjectId | undefined;

const adminCode =
	'b109f3bbbc244eb82441917ed06d618b9008dd09b3befd1b5e07394c706a8bb980b1d7785e5976ec049b46df5f1326af5a2ea6d103fd07c95385ffab0cacbc86'; //password

beforeAll(async () => {
	await mongoose.connect(process.env.URITEST ?? '');
	await Area.deleteMany({});
	await Campaign.deleteMany({});

	areaId = (
		await Area.create({
			name: 'setSatisfactionTest',
			password: 'password',
			campaignList: [],
			adminPassword: adminCode
		})
	).id;

	CampaignId = (
		await Campaign.create({
			name: 'setSatisfactionTest',
			script: 'setSatisfactionTest',
			active: true,
			area: areaId,
			status: ['In progress', 'Finished'],
			password: 'password'
		})
	).id;
	Area.updateOne({ _id: areaId }, { $push: { campaignList: CampaignId } });
});

afterAll(async () => {
	await mongoose.connection.close();
});

describe('post on /admin/campaign/setSatisfaction', () => {
	it('should return 400 if satisfactions is not an array', async () => {
		const res = await request(app).post('/admin/campaign/setSatisfaction').send({
			adminCode,
			area: areaId,
			allreadyHaseded: true,
			satisfactions: 'notAnArray'
		});
		expect(res.status).toBe(400);
		expect(res.body.message).toBe('Invalid satisfaction, satisfactions must be a array<string>');
	});
	it('should return 401 if the admin code is wrong', async () => {
		const res = await request(app).post('/admin/campaign/setSatisfaction').send({
			adminCode: 'wrong',
			area: areaId,
			allreadyHaseded: true
		});
		expect(res.status).toBe(401);
		expect(res.body.message).toBe('Wrong admin code');
	});

	it('should return 401 if the campaign id is wrong', async () => {
		const res = await request(app).post('/admin/campaign/setSatisfaction').send({
			adminCode,
			area: areaId,
			CampaignId: new Types.ObjectId().toHexString(),
			allreadyHaseded: true
		});
		expect(res.status).toBe(401);
		expect(res.body.message).toBe('Wrong campaign id');
	});

	it('should return 400 if satisfactions is not an array of string', async () => {
		const res = await request(app)
			.post('/admin/campaign/setSatisfaction')
			.send({
				adminCode,
				area: areaId,
				allreadyHaseded: true,
				satisfactions: [42]
			});
		expect(res.status).toBe(400);
		expect(res.body.message).toBe('Invalid satisfaction, satisfactions must be a array<string>');
	});

	it('should return 200 if satisfactions is an array', async () => {
		const res = await request(app)
			.post('/admin/campaign/setSatisfaction')
			.send({
				adminCode,
				area: areaId,
				allreadyHaseded: true,
				satisfactions: ['satisfaction1', 'satisfaction2']
			});
		expect(res.status).toBe(200);
		expect(res.body.message).toBe('Satisfaction updated');
		const campaign = await Campaign.findOne({ _id: CampaignId });
		expect(campaign?.status).toStrictEqual(['satisfaction1', 'satisfaction2']);
	});
});
