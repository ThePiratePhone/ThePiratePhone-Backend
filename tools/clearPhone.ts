export default function clearPhone(phoneNumber: string) {
	if (phoneNumber.startsWith('0')) {
		phoneNumber = phoneNumber.replace('0', '+33');
	}
	if (phoneNumber.includes(' ')) {
		phoneNumber = phoneNumber.replaceAll(' ', '');
	}
	return phoneNumber;
}
