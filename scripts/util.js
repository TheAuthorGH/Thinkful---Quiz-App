'use strict';

/* Extra utlity, out of the scope of the quiz assignment. */

// Based on https://github.com/Daplie/knuth-shuffle/blob/master/index.js
function shuffleArray(array) {
	let currentIndex = array.length;
	let temporaryValue;
	let randomIndex;

	while (0 !== currentIndex) {
		randomIndex = Math.floor(Math.random() * currentIndex);
		currentIndex -= 1;
		temporaryValue = array[currentIndex];
		array[currentIndex] = array[randomIndex];
		array[randomIndex] = temporaryValue;
	}
	
	return array;
}