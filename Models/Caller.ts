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
	areasJoined: {
		type: [mongoose.Schema.ObjectId],
		ref: 'Area',
		required: true,
		default: []
	},
	campaigns: {
		type: [mongoose.Schema.ObjectId],
		ref: 'Campaign',
		required: true,
		default: []
	},
	createdAt: {
		type: Date,
		default: new Date()
	}
});

export const Caller = mongoose.model('caller', CallerSchema);
