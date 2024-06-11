import mongoose from 'mongoose';

const CallModel = new mongoose.Schema({
	Client: {
		type: mongoose.Schema.ObjectId,
		ref: 'Client',
		required: true
	},
	Caller: {
		type: mongoose.Schema.ObjectId,
		ref: 'Caller',
		required: true
	},
	Campaign: {
		type: mongoose.Schema.ObjectId,
		ref: 'Campaign',
		required: true
	},
	satisfaction: {
		type: Number,
		required: false,
		//[voted, not interested, interested, not answered, removed]
		enum: [0, 1, 2, 3, 4]
	},
	comment: {
		type: String,
		required: false
	},
	status: {
		type: String,
		required: true,
		enum: ['In progress', 'to recall', 'Done', 'deleted']
	},
	start: {
		type: Date,
		default: Date.now()
	},
	duration: {
		type: Number,
		required: false
	},
	lastInteraction: {
		type: Date,
		default: Date.now()
	}
});

export const Call = mongoose.model('Call', CallModel);
