import mongoose from 'mongoose';

const ClientSchema = new mongoose.Schema({
	name: {
		type: String,
		required: true
	},
	phone: {
		type: String,
		required: true
	},
	createdAt: {
		type: Date,
		default: Date.now()
	}
});

export const Client = mongoose.model('Client', ClientSchema);
