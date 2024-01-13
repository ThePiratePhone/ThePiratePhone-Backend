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

export default mongoose.model('Caller', CallerSchema);
