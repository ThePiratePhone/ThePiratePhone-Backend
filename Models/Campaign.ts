import mongoose from 'mongoose';

const CampaignSchema = new mongoose.Schema({
	name: {
		type: String,
		required: true,
		index: true
	},
	script: {
		type: String,
		required: true
	},
	active: {
		type: Boolean,
		required: true,
		default: false
	},
	area: {
		type: mongoose.Schema.ObjectId,
		ref: 'Area',
		required: true,
		index: true
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
	},
	//personalisation
	nbMaxCallCampaign: {
		type: Number,
		required: true,
		default: 4
	},
	timeBetweenCall: {
		type: Number,
		required: true,
		default: 10_800_000
	},
	callHoursStart: {
		type: Date,
		required: true,
		default: new Date(0)
	},
	callHoursEnd: {
		type: Date,
		required: true,
		default: new Date(0)
	},
	callPermited: {
		type: Boolean,
		require: true,
		default: true
	}
});

export const Campaign = mongoose.model('Campaign', CampaignSchema);
