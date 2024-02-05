import mongoose from 'mongoose';
const CampaignSchema = new mongoose.Schema({
	name: {
		type: String,
		required: true
	},
	script: {
		type: Array<String>(),
		required: true
	},
	dateStart: {
		type: Date,
		required: true
	},
	dateEnd: {
		type: Date,
		required: true
	},
	callerList: {
		type: [mongoose.Schema.Types.ObjectId],
		ref: 'Caller',
		required: true
	},
	area: {
		type: mongoose.Schema.ObjectId,
		ref: 'Area',
		required: true
	},
	createdAt: {
		type: Date,
		default: Date.now()
	},
	trashUser: {
		type: [mongoose.Schema.Types.ObjectId],
		ref: 'Client',
		required: true
	},
	password: {
		type: String,
		required: true
	}
});

export const Campaign = mongoose.model('Campaign', CampaignSchema);
