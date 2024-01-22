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
		minlength: 12,
		maxlength: 13,
		unique: true
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
		type: mongoose.Schema.ObjectId,
		ref: 'Client',
		required: false
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
