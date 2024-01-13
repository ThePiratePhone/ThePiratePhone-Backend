import mongoose from 'mongoose';
import { Caller } from './Caller';
const ClientSchema = new mongoose.Schema({
	name: {
		type: String,
		required: true
	},
	phone: {
		type: String,
		required: true
	},
	called: {
		type: String,
		enum: ['called', 'not called', 'not answered', 'inprogress'],
		required: true
	},
	caller: {
		type: Caller,
		required: false
	},
	scriptVersion: {
		type: Number,
		required: false
	},
	endCall: {
		type: Number,
		required: false
	},
	createdAt: {
		type: Date,
		default: Date.now()
	}
});

export const Client = mongoose.model('Client', ClientSchema);
