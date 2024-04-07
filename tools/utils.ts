function cleanSatisfaction(satisfaction: number | null) {
	switch (satisfaction) {
		case -2:
			return 'A retirer';
		case -1:
			return 'Pas interessé·e';
		case 0:
			return 'Pas de réponse';
		case 1:
			return 'Pas voté pour nous';
		case 2:
			return 'Voté pour nous';
		default:
			return 'Une erreur est survenue. Contactez les développeurs';
	}
}

function CleanStatus(status: 'called' | 'not called' | 'not answered' | 'inprogress' | undefined) {
	switch (status) {
		case 'called':
			return 'Appelé·e';
		case 'not called':
			return 'Non appelé·e';
		case 'inprogress':
			return 'Appel en cours';
		case 'not answered':
			return 'Aucune réponse';
		default:
			return 'Aucune info';
	}
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

export { cleanSatisfaction, CleanStatus, humainPhone };
