/**
 * ATE (attack tree evaluator)
 * @module trespass/analysis/ate
 */


const parseLine =
/**
 * parses a single line, and returns a result object.
 *
 * @param {String} line
 * @returns {Object} result object
 */
module.exports.parseLine =
function parseLine(line) {
	const parts = line
		// remove leading and trailing parentheses
		.replace(/^\(/i, '')
		.replace(/\)$/i, '')

		// split on comma
		.split(',')
		.map((line) => line.trim());

	const [ probability, cost, labelsStr ] = parts;
	const labels = labelsStr.split(/ AND /g)
		.map((line) => line.trim());

	return {
		labels,
		cost: parseFloat(cost, 10),
		probability: parseFloat(probability, 10),
	};
};


const parse =
/**
 * parses ate results.
 *
 * @param {String} str - tool output string
 * @returns {Array} list result objects
 */
module.exports.parse =
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
