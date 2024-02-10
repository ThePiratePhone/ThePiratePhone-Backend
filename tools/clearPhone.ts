export default function clearPhone(phoneNumber: string) {
	if (phoneNumber.startsWith('0')) {
		return phoneNumber.replace('0', '+33');
	}
	if (!phoneNumber.includes(' ')) {
		return phoneNumber.replace(' ', '');
	}
	return phoneNumber;
}
