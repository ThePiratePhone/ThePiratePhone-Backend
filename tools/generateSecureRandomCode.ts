function generateSecureRandomCode(length: number): string {
	const charset = '0123456789';
	const charsetLength = charset.length;
	const randomBytes = new Uint8Array(length);
	crypto.getRandomValues(randomBytes);
	let code = '';
	for (let i = 0; i < length; i++) {
		code += charset[randomBytes[i] % charsetLength];
	}
	return code;
}
export default generateSecureRandomCode;
