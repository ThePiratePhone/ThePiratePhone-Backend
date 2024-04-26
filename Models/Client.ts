import mongoose from 'mongoose';
import { Campaign } from './Campaign';

const ClientSchema = new mongoose.Schema({
	name: {
		type: String,
		index: 'text',
		required: false
	},
	firstname: {
		type: String,
		index: 'text',
		require: false
	},
	institution: {
		type: String,
		required: false
	},
	phone: {
		type: String,
		required: true,
		unique: true,
		minlength: 12,
		maxlength: 13
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

export const Client = mongoose.model('Client', ClientSchema);
