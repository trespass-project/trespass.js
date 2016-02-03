'use strict';

// `trespass.js` is the core library used in the node.js or web-based tools in the [TREsPASS project](https://www.trespass-project.eu/).
// It is divided into the following sub-modules:

module.exports = {
	// ## [trespass.model](model.html)
	// Functions to work with the TREsPASS model format.
	model: require('./model.js'),

	// ## [trespass.attacktree](attacktree.html)
	// Functions to process attack trees.
	attacktree: require('./attacktree.js'),

	// ## [trespass.apis](apis.html)
	// Functions for using a number of APIs.
	apis: require('./apis.js'),
};
