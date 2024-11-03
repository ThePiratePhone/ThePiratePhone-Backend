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
		maxlength: 13,
		index: true
	},
	pinCode: {
		type: String,
		required: true,
		length: 4,
		unique: false,
		index: true
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
	},
	area: {
		type: mongoose.Schema.ObjectId,
		ref: 'Area',
		required: true
	}
});

export const Caller = mongoose.model('caller', CallerSchema);
