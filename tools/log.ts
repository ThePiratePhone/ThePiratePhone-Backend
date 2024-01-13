import path from 'path';
import fs from 'fs';
import { bgRed, blue, gray, red, yellow } from 'chalk';

type WarningLevel = 'DEBUG' | 'INFORMATION' | 'WARNING' | 'ERROR' | 'CRITICAL';

// Formation:
// (2023-04-28T11:27:47.509Z) [ERROR]> bad password for test@exemple.com
// (2023-04-28T11:27:47.509Z) [INFORMATION]> test@exemple.com connected
/**
 * Impact Levels:
 * - INFORMATION: No impact on the system or user.
 * - WARNING: Minor impact that can be easily corrected.
 * - ERROR: Moderate impact that requires attention.
 * - CRITICAL: Significant impact that can cause damage or data loss.
 */
export async function Log(text: string, impact: WarningLevel = 'DEBUG', location: string | undefined) {
	const date = new Date().toLocaleDateString('en-GB', {
		timeZone: 'Europe/Paris',
		year: '2-digit',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit'
	});
	const logDir = './log';
	const logFilePath = path.resolve(`${logDir}/log.log`);

	// Vérifier si le dossier log existe
	if (!fs.existsSync(logDir)) {
		fs.mkdirSync(logDir);
	}
	let coloredImpact = '';
	switch (impact) {
		case 'INFORMATION':
			coloredImpact = blue(impact);
			break;
		case 'WARNING':
			coloredImpact = yellow(impact);
			break;
		case 'ERROR':
			coloredImpact = red(impact);
			break;
		case 'CRITICAL':
			coloredImpact = bgRed.white(impact);
			break;
		case 'DEBUG':
			coloredImpact = gray(impact);
			break;
	}

	const message = `(${date}) ${location ? '[' + location + ']' : ''}> ${coloredImpact} ${text}\n`;
	console.log(message);
	// append log in file
	fs.appendFile(logFilePath, message, err => {});
}
