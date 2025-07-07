import mongoose from 'mongoose';

const AreaModel = new mongoose.Schema({
	name: {
		type: String,
		required: true,
		index: true
	},
	campaignList: {
		type: Array<typeof mongoose.Schema.ObjectId>,
		ref: 'Campaign',
		required: true
	},
	adminPassword: {
		type: String,
		required: true
	},
	createdAt: {
		type: Date,
		default: Date.now()
	},
	adminPhone: {
		type: Array<[string, string | undefined]>, // [phone, name?]
		required: true,
		index: false,
		default: []
	}
});

export const Area = mongoose.model('area', AreaModel);
