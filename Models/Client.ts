import mongoose from 'mongoose';

const ClientSchema = new mongoose.Schema({
	name: {
		type: String,
		index: 'text',
		required: false
	},
	institution: {
		type: String,
		required: false
	},
	promotion: {
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
	data: {
		required: true,
		type: Map,
		of: [
			{
				status: {
					type: String,
					enum: ['called', 'not called', 'not answered', 'inprogress'],
					required: true
				},
				caller: {
					type: mongoose.Schema.ObjectId,
					ref: 'Caller',
					required: false
				},
				scriptVersion: {
					type: Number,
					required: false
				},
				startCall: {
					type: Date,
					required: false
				},
				endCall: {
					type: Date,
					required: false
				},
				satisfaction: {
					type: Number,
					min: -2,
					max: 2,
					required: false
				},
				comment: {
					type: String,
					required: false
				}
			}
		]
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

export const Client = mongoose.model('Client', ClientSchema);
