import mongoose from 'mongoose';
const CallerSchema = new mongoose.Schema({
	name: {
		type: String,
		required: true
	},
	phone: {
		type: String,
		required: true
	},
	pinCode: {
		type: String,
		required: true,
		length: 4
	},
	timeInCall: {
		type: Map,
		of: Number,
		required: false
	},
	createdAt: {
		type: Date,
		default: Date.now()
	}
});

export const Caller = mongoose.model('Caller', CallerSchema);
