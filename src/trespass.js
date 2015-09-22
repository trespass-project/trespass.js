'use strict';

// `trespass.js` is the core library used in the node.js or web-based tools in the [TREsPASS project](https://www.trespass-project.eu/).
// it is divided into the following sub-modules:

module.exports = {
	// ## [trespass.model](model.html)
	// functions to work with the trespass model. Can load models in the xml format, or create models from scratch. also provides conversion from the internal representation back to xml.
	model: require('./model.js'),

	// ## [trespass.attacktree](attacktree.html)
	// functions to process attack trees — including loading, doing basic calculations on them, and preparing them for visualization.
	attacktree: require('./attacktree.js'),

	// ## [trespass.util](util.html)
	// utility functions for manipulating xml dom nodes, and other common helper functions.
	util: require('./util.js'),
};
