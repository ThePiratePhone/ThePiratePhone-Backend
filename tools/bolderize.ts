function bolderize(text: string): string {
	return text
		.split('')
		.map(char => {
			const code = char.codePointAt(0);

			if (typeof code == 'undefined') return char;

			if (code >= 97 && code <= 122) {
				return String.fromCodePoint(code + 120_205);
			} else if (code >= 65 && code <= 90) {
				return String.fromCodePoint(code + 120_211);
			} else if (code >= 48 && code <= 57) {
				return String.fromCodePoint(code + 120_764);
			}
			return char;
		})
		.join('');
}
export default bolderize;
