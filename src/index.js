// `trespass.js` is the core library used in the node.js or web-based tools in the [TREsPASS project](https://www.trespass-project.eu/).

const model = require('./model');
const attacktree = require('./attacktree');
const analysis = require('./analysis');
const api = require('./api');

// It is divided into the following sub-modules:
module.exports = {
	// ## [trespass.model](model.html)
	// Functions to work with the TREsPASS model format.
	model,

	// ## [trespass.attacktree](attacktree.html)
	// Functions to process attack trees.
	attacktree,

	// ## [trespass.analysis](analysis.html)
	// Functions for parsing analysis results.
	analysis,

	// ## [trespass.api](api.html)
	// Functions for using a number of APIs.
	api,
};
