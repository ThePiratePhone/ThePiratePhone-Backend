import mongoose from 'mongoose';
import { log } from './log';

function getFileName(filename: string) {
	return filename?.split('\\')?.at(-1)?.split('/')?.at(-1) ?? 'error';
}

function clearPhone(phoneNumber: string): string {
	if (typeof phoneNumber != 'string') return '';
	phoneNumber = phoneNumber.trim();

	phoneNumber = phoneNumber.replaceAll(' ', '');
	phoneNumber = phoneNumber.replaceAll('.', '');
	phoneNumber = phoneNumber.replaceAll('-', '');
	phoneNumber = phoneNumber.replaceAll('o', '0');
	phoneNumber = phoneNumber.replaceAll('(', '');
	phoneNumber = phoneNumber.replaceAll(')', '');
	phoneNumber = phoneNumber.replaceAll('+33', '33');

	if (phoneNumber.startsWith('6') || phoneNumber.startsWith('7')) {
		phoneNumber = '0' + phoneNumber;
	}
	if (phoneNumber.startsWith('33') && phoneNumber.length == 11) {
		phoneNumber = '0' + phoneNumber.slice(2);
	}
	if (phoneNumber.startsWith('0')) {
		phoneNumber = phoneNumber.replace('0', '+33');
	}
	return phoneNumber;
}

function phoneNumberCheck(phone: string): boolean {
	if (typeof phone != 'string') return false;
	if (!phone.startsWith('+')) return false;

	const phoneArray = phone.split('');
	if (phone.length % 2 == 0) {
		phoneArray.splice(0, 3);
	} else {
		phoneArray.splice(0, 4);
	}
	phone = phoneArray.join('');
	if (phone.match(/^[0-9]{9}$/)) return true;
	return false;
}

function humainPhone(number: string) {
	const numberArray = number.split('');
	let newNumber = '';
	if (number.length % 2) {
		newNumber += numberArray.splice(0, 4).join('');
	} else {
		newNumber += numberArray.splice(0, 3).join('');
	}
	newNumber += ' ' + numberArray.splice(0, 1);
	for (let i = 0; i < numberArray.length; i = i + 2) {
		newNumber += ' ' + numberArray[i] + numberArray[i + 1];
	}

	if (newNumber.startsWith('+33 ')) {
		newNumber = newNumber.replace('+33 ', '0');
	}

	return newNumber;
}

function cleanStatus(status: 'In progress' | 'to recall' | 'Done' | 'deleted' | undefined) {
	switch (status) {
		case 'In progress':
			return 'En cours';
		case 'to recall':
			return 'Doit être rappelé·e';
		case 'Done':
			return 'Appelé·e';
		case 'deleted':
			return 'Supprimé·e';
		default:
			return 'Pas appelé·e';
	}
}

function sanitizeString(str: string) {
	str = str.replace(/[^\p{L}\p{N} \.,_-]/gu, '');
	return str.trim();
}

/**
 * Check if the parameters are in the body
 * @param body
 * @param res
 * @param parameters - Array of [string, any, bolean?] where the first string is the name of the parameter and the second is the type of the parameter, the third is optional and is a boolean to check if the parameter is optional
 * @param orgin
 * @returns boolean - true if all parameters are in the body
 *
 * @throws 400 - Missing parameters body is empty
 * @throws 400 - Missing parameters ( first parameter missing)
 */
function checkParameters(
	body: any,
	res: any,
	parameters: Array<
		[
			string,
			'string' | 'number' | 'bigint' | 'boolean' | 'symbol' | 'undefined' | 'object' | 'function' | 'ObjectId',
			boolean?
		]
	>,
	orgin: string
): boolean {
	const ip = res.req.hostname;
	if (parameters.length == 0) return true;
	if (!body || Object.keys(body).length == 0) {
		res.status(400).send({ message: 'Missing parameters body is empty', OK: false });
		log(`Missing parameters body is empty from ` + ip, 'WARNING', orgin);
		return false;
	}
	for (let parameter of parameters) {
		if (parameter[2] && !body[parameter[0]]) {
			continue;
		}

		if (body[parameter[0]] == undefined) {
			res.status(400).send({ message: `Missing parameters (${parameter.join(':')})`, OK: false });
			log(`Missing parameters (${parameter.join(':')}) from ` + ip, 'WARNING', orgin);
			return false;
		}

		const errorText = `Wrong type for parameter (${parameter[0]} is type: ${typeof body[
			parameter[0]
		]} but required type is ${parameter[1]})`;

		if (parameter[1] == 'ObjectId') {
			if (body[parameter[0]].length != 24) {
				res.status(400).send({
					message: errorText,
					OK: false
				});
				log(errorText + ` from ` + ip, 'WARNING', orgin);
				return false;
			}
			if (!mongoose.isValidObjectId(body[parameter[0]])) {
				res.status(400).send({
					message: errorText,
					OK: false
				});
				log(errorText + ` from ` + ip, 'WARNING', orgin);
				return false;
			}
		} else if (parameter[1] == 'number' && isNaN(parseInt(body[parameter[0]]))) {
			res.status(400).send({
				message: errorText,
				OK: false
			});
			log(errorText + ` from ` + ip, 'WARNING', orgin);
			return false;
		} else if (typeof body[parameter[0]] != parameter[1]) {
			res.status(400).send({
				message: errorText,
				OK: false
			});
			log(errorText + ` from ` + ip, 'WARNING', orgin);
			return false;
		}
	}
	return true;
}

function checkPinCode(pinCode: string, res: any, orgin: string): boolean {
	if (pinCode.length != 4 || Number.isNaN(parseInt(pinCode))) {
		res.status(400).send({ message: 'Invalid pin code', OK: false });
		log(`Invalid pin code from: ` + res.req.hostname, 'WARNING', orgin);
		return false;
	}
	return true;
}

export {
	checkParameters,
	cleanStatus,
	clearPhone,
	getFileName,
	humainPhone,
	phoneNumberCheck,
	checkPinCode,
	sanitizeString
};
