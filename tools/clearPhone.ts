export default function clearPhone(phoneNumber: string): string {
	if (typeof phoneNumber != 'string') return '';
	phoneNumber = phoneNumber.trim();

	phoneNumber = phoneNumber.replaceAll(' ', '');
	phoneNumber = phoneNumber.replaceAll('.', '');
	phoneNumber = phoneNumber.replaceAll('-', '');
	phoneNumber = phoneNumber.replaceAll('(+)', '0');
	phoneNumber = phoneNumber.replaceAll('o', '0');
	phoneNumber = phoneNumber.replaceAll('(', '');
	phoneNumber = phoneNumber.replaceAll(')', '');

	if (phoneNumber.startsWith('6') || phoneNumber.startsWith('7')) {
		phoneNumber = '0' + phoneNumber;
	}
	if (phoneNumber.startsWith('0')) {
		phoneNumber = phoneNumber.replace('0', '+33');
	}
	return phoneNumber;
}
