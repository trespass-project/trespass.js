'use strict';

// `trespass.js` is a javascript library for the [TREsPASS project](https://www.trespass-project.eu/).
// it consists of the following sub-modules:

module.exports = {
	// ## [trespass.model](model.html)
	// functions to work with the trespass model. Can load models in the xml format, or create models from scratch. also provides conversion from the internal representation back to xml.
	// processing the socio-technical model XML format.
	model: require('./model.js'),

	// ## [trespass.tree](tree.html)
	// functions to process attack trees — including loading, doing basic calculations on them, and preparing them for visualization.
	tree: require('./tree.js'),

	// ## [trespass.util](util.html)
	// utility functions for manipulating xml dom nodes, and other common helper functions.
	util: require('./util.js'),
};
