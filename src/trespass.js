'use strict';

// `trespass.js` is a javascript library for the [TREsPASS project](https://www.trespass-project.eu/).
// it consists of the following sub-modules:

module.exports = {
	// ## [trespass.model](model.html)
	// processing the socio-technical model XML format
	model: require('./model.js'),

	// ## [trespass.tree](tree.html)
	// processing attack trees
	tree: require('./tree.js'),

	// ## [trespass.util](util.html)
	// all kinds of helper functions
	util: require('./util.js'),
};
