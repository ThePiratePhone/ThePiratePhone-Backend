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
	CampaignList: {
		type: Array<typeof mongoose.Schema.ObjectId>,
		ref: 'Campaign',
		required: true
	},
	AdminPassword: {
		type: String,
		required: true
	},
	adminPhone: {
		type: String,
		required: true,
		minlength: 12,
		maxlength: 13,
		unique: true
	},
	createdAt: {
		type: Date,
		default: Date.now()
	}
});

export const Area = mongoose.model('Area', AreaModel);
