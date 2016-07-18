/**
 * @module trespass
 */

const model = require('./model');
const attacktree = require('./attacktree');
const analysis = require('./analysis');
const api = require('./api');

module.exports = {
	/**
	 * [trespass/model]{@link module:trespass/model}
	 */
	model,

	/**
	 * [trespass/attacktree]{@link module:trespass/attacktree}
	 */
	attacktree,

	/**
	 * [trespass/analysis]{@link module:trespass/analysis}
	 */
	analysis,

	/**
	 * [trespass/api]{@link module:trespass/api}
	 */
	api,
};
