import mongoose from 'mongoose';
const CallerSchema = new mongoose.Schema({
	name: {
		type: String,
		required: true,
		unique: true
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
	timeInCall: {
		type: [{ date: Date, client: mongoose.Schema.ObjectId, time: Number }],
		ref: 'Client',
		required: true
	},
	curentCall: {
		campaign: {
			type: mongoose.Schema.ObjectId,
			ref: 'Campaign',
			required: false
		},
		client: {
			type: mongoose.Schema.ObjectId,
			ref: 'Client',
			required: false
		}
	},
	area: {
		type: mongoose.Schema.ObjectId,
		ref: 'Area',
		required: true
	},
	createdAt: {
		type: Date,
		default: Date.now()
	}
});

export const Caller = mongoose.model('Caller', CallerSchema);
