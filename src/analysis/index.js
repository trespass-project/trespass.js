/**
 * Functions for parsing analysis results.
 * @module trespass/analysis
 */

// attack tree evaluator
module.exports.ate = {};


const parseLine =
module.exports.ate.parseLine =
function parseLine(line) {
	const parts = line
		// remove leading and trailing parentheses
		.replace(/^\(/i, '')
		.replace(/\)$/i, '')

		// split on comma
		.split(',')
		.map((line) => line.trim());

	const [ probability, cost, labelsStr ] = parts;
	const labels = labelsStr.split(/ AND /ig)
		.map((line) => line.trim());

	return {
		labels,
		cost: parseFloat(cost, 10),
		probability: parseFloat(probability, 10),
	};
};


const parse =
module.exports.ate.parse =
function parse(str) {
	const lines = str
		// split on line breaks
		.replace(/\r/ig)
		.split(/\n+/ig)

		// trim white space
		.map((line) => line.trim())

		// all interesting lines start with `(`
		.filter((line) => (line[0] === '('))

		// return structured data
		.map(parseLine);

	return lines;
};
