import axios from 'axios';
import chalk from 'chalk';
import { log } from './log';

async function sendSms(phoneNumber: string, message: string) {
	message = message.replaceAll('\n', '%0a');
	const phoneArray = phoneNumber.split('');
	if (phoneArray[0] == '0') {
		phoneArray.shift();
		phoneArray.unshift('3');
		phoneArray.unshift('3');
		phoneArray.unshift('+');
		phoneNumber = phoneArray.join('');
	} else if (phoneNumber[0] != '+') {
		log(`Error sending sms to ${phoneNumber}: invalid phone number`, 'ERROR', 'sendSms.ts');
		return;
	}
	log(`Sending sms to ${phoneNumber}: ${message}`, 'INFORMATION', 'sendSms.ts');

	const res = await axios.post(`http://${process.env.PHONE_IP}/send?message=${message}&phoneno=%2B${phoneNumber}`);
	if (res?.data?.body?.success != true && typeof res?.data?.body?.success == undefined) {
		log(`Error sending sms to ${phoneNumber}: ${res?.data?.body?.message}`, 'ERROR', 'sendSms.ts');
		return false;
	}
	return true;
}

export default sendSms;
