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
	if (!phone.match(/^[0-9]{9}$/)) return false;
	return true;
}

export default phoneNumberCheck;
