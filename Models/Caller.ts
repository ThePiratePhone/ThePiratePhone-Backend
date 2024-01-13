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
	createdAt: {
		type: Date,
		default: Date.now()
	}
});

export const Caller = mongoose.model('Caller', CallerSchema);
