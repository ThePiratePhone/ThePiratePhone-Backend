function cleanSatisfaction(satisfaction: number) {
	switch (satisfaction) {
		case -2:
			return 'A retirer';
		case -1:
			return 'Pas interessé';
		case 0:
			return 'Pas de réponse';
		case 1:
			return 'Pas voté pour nous';
		case 2:
			return 'Voté pour nous';
		default:
			return 'une erreur est survenu, contacté les devloppeur';
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

export { cleanSatisfaction, CleanStatus };
