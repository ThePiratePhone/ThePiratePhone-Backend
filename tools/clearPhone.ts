export default function clearPhone(phoneNumber: string): string {
	if (typeof phoneNumber != 'string') return '';
	phoneNumber = phoneNumber.trim();
	if (phoneNumber.includes(' ')) {
		phoneNumber = phoneNumber.replaceAll(' ', '');
	}
	if (phoneNumber.includes('-')) {
		phoneNumber = phoneNumber.replaceAll('-', '');
	}
	if (phoneNumber.includes('(')) {
		phoneNumber = phoneNumber.replaceAll('(', '');
	}
	if (phoneNumber.includes(')')) {
		phoneNumber = phoneNumber.replaceAll(')', '');
	}
	if (phoneNumber.startsWith('0')) {
		phoneNumber = phoneNumber.replace('0', '+33');
	}
	return phoneNumber;
}
