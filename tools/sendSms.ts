import axios from 'axios';
import chalk from 'chalk';

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
		console.log('[' + chalk.red('ERROR') + '] Bad phoneNumber: ' + phoneNumber);
		return;
	}
	console.log(`[>${chalk.green(phoneNumber)}>] ${message}`);

	const res = await axios.post(`http://${process.env.PHONE_IP}/send?message=${message}&phoneno=%2B${phoneNumber}`);
	if (res?.data?.body?.success != true && typeof res?.data?.body?.success == undefined) {
		console.log('[' + chalk.red('ERROR') + ']' + ' send error ' + res?.data?.body?.message);
	}
}

export default sendSms;
