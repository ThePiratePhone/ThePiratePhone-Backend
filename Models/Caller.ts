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
	timeInCall: {
		required: true,
		type: [
			{
				date: { type: Date, require: true },
				client: { type: mongoose.Schema.ObjectId, ref: 'Client', required: true },
				time: { type: Number, required: false },
				campaign: { type: mongoose.Schema.ObjectId, ref: 'Campaign', required: true }
			}
		]
	},
	currentCall: {
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
