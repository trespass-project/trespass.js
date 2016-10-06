/**
 * Functions for parsing analysis results.
 * @module trespass/analysis
 */

const R = require('ramda');


/* eslint global-require: 0 */
module.exports = {
	/**
	 * [trespass/analysis/ate]{@link module:trespass/analysis/ate}
	 */
	ate: require('./ate.js'),
	/**
	 * [trespass/analysis/attop]{@link module:trespass/analysis/attop}
	 */
	attop: require('./attop.js'),
};


const analysisTools =
module.exports.analysisTools = {
	'Treemaker': {
		outputFileName: 'treemaker_output_combined.xml',
	},
	'Attack Pattern Lib.': {
		outputFileName: 'apl_output.xml',
	},
	'A.T. Analyzer': {
		outputFileName: 'ata_output.zip',
	},
	'A.T. Evaluator': {
		outputFileName: 'ate_output.txt',
	},
	'ATtop': {
		// TODO:
	}
};

const analysisToolNames =
module.exports.analysisToolNames = R.keys(analysisTools);

const analysisToolNamesStrict =
module.exports.analysisToolNamesStrict = R.without(
	['Treemaker', 'Attack Pattern Lib.'],
	analysisToolNames
);
