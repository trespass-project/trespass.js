var _ = require('lodash');
var cheerio = $ = require('cheerio');
var util = require('./util.js');


// ---
// parse XML with [`cheerio`](https://www.npmjs.com/package/cheerio), so that we can query the
// model jquery-style.
module.exports.parse =
parse = function(
	xml, /* String */
	selector /* String (optional) */
) {
	var $ = cheerio.load(xml, util.cheerio_opts);

	// returns a `selection` — optionally pre-selecting `selector`
	return (!selector) ? $ : $(selector);
};


// ---
// transforms a `selection` to an `Object`
module.exports.prepare =
prepare = function(
	$system /* selection */
) {
	var model = {
		locations: [],
		edges: [],
		assets: [],
		actors: [],
		predicates: [],
		processes: [],
		policies: []
	};

	function process($selection, fn, destination) {
		$selection.each(function(index, elem) {
			var $item = $(elem, util.cheerio_opts);
			var item = _.extend({}, $item.attr());
			fn($item, item);
			destination.push(item);
		});
	}

	/* locations */
	process(
		$system.find('locations > location'),
		function($item, item) {
			_.extend(item, {
				atLocations: util.get_children_text($item, 'atlocations')
			});
		},
		model.locations
	);

	/* edges */
	process(
		$system.find('edges > edge'),
		function($item, item) {
			_.extend(item, util.children_to_obj($item, 'source, target'));
		},
		model.edges
	);

	/* assets */
	process(
		$system.find('assets > item, assets > data'),
		function($item, item) {
			_.extend(item, {
				type: item.name,
				atLocations: util.get_children_text($item, 'atlocations')
			});
		},
		model.assets
	);

	/* actors */
	process(
		$system.find('actors > actor'),
		function($item, item) {
			_.extend(item, {
				atLocations: util.get_children_text($item, 'atlocations')
			});
		},
		model.actors
	);

	// TODO:
	// - processes
	// - policies

	/* predicates */
	process(
		$system.find('predicates > predicate'),
		function($item, item) {
			_.extend(item, {
				values: util.get_children_text($item, 'value')
					.map(function(vals) {
						return vals.split(' ');
					})
			});
		},
		model.predicates
	);

	return model;
};
