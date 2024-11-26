import mongoose from 'mongoose';

const CallModel = new mongoose.Schema({
	client: {
		type: mongoose.Schema.ObjectId,
		ref: 'client',
		required: true,
		unique: false,
		index: true
	},
	caller: {
		type: mongoose.Schema.ObjectId,
		ref: 'caller',
		required: true,
		unique: false,
		index: true
	},
	campaign: {
		type: mongoose.Schema.ObjectId,
		ref: 'campaign',
		required: true,
		unique: false,
		index: true
	},
	satisfaction: {
		type: String,
		required: false
	},
	comment: {
		type: String,
		required: false
	},
	status: {
		type: Boolean,
		required: false
	},
	start: {
		type: Date,
		default: new Date()
	},
	duration: {
		type: Number,
		required: false
	},
	lastInteraction: {
		type: Date,
		default: new Date()
	}
});

export const Call = mongoose.model('call', CallModel);
