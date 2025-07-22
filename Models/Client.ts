import mongoose from 'mongoose';

const ClientSchema = new mongoose.Schema({
	name: {
		type: String,
		index: 'text',
		required: true
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
		maxlength: 13,
		index: true
	},
	campaigns: {
		type: [mongoose.Schema.ObjectId],
		ref: 'Campaign',
		required: true,
		default: []
	},
	priority: {
		type: [
			{
				campaign: mongoose.Schema.ObjectId,
				id: String
			}
		],
		required: false,
		default: []
	},
	createdAt: {
		type: Date,
		default: Date.now()
	}
});

export const Client = mongoose.model('client', ClientSchema);
