/**
 * ATtop
 * @module trespass/analysis/attop
 */

const R = require('ramda');


function getNonEmptyLines(str) {
	return str
		.replace(/[\r\n]+/ig, '\n')
		.split(/\n/ig)
		.map(R.trim)
		.filter((line) => (line !== ''));
}


const parseAttackVector =
/**
 * parses an attack vector string, and returns a list of labels.
 *
 * @param {String} str - (labels on separate lines)
 * @returns {Array} list of labels
 */
module.exports.parseAttackVector =
function parseAttackVector(str) {
	return getNonEmptyLines(str);
};


const parseInterval =
/**
 * parses an interval string, and returns a list of numbers.
 *
 * @param {String} str - interval string
 * @returns {Array} list of numbers
 */
module.exports.parseInterval =
function parseInterval(str) {
	return str.trim()
		.replace(/[\[\]]/ig, '')
		.split(',')
		.map(R.trim)
		.filter((item) => (item !== ''))
		.map((item) => parseFloat(item, 10));
};


const parseTimeSeries =
/**
 * parses an time series string, and returns a list of times and intervals.
 *
 * @param {String} str - time series string
 * @returns {Array} list of `{ time, interval }`
 */
module.exports.parseTimeSeries =
function parseTimeSeries(str) {
	return getNonEmptyLines(str)
		.map((line) => {
			const parts = line.split(/\s+/ig);
			return {
				time: parseFloat(R.head(parts), 10),
				interval: parseInterval(R.tail(parts).join(' ')),
			};
		});
};
