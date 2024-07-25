import mongoose from 'mongoose';

const AreaModel = new mongoose.Schema({
	name: {
		type: String,
		required: true,
		index: true
	},
	password: {
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
	}
});

export const Area = mongoose.model('area', AreaModel);
