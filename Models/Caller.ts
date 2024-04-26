import mongoose from 'mongoose';

const CallerSchema = new mongoose.Schema({
	name: {
		type: String,
		required: true,
		index: true,
		unique: false
	},
	phone: {
		type: String,
		required: true,
		unique: true,
		minlength: 12,
		maxlength: 13
	},
	pinCode: {
		type: String,
		required: true,
		length: 4
	},
	campaigns: {
		type: [mongoose.Schema.ObjectId],
		ref: 'Campaign',
		required: true,
		default: []
	},
	createdAt: {
		type: Date,
		default: Date.now()
	}
});

export const Caller = mongoose.model('Caller', CallerSchema);
