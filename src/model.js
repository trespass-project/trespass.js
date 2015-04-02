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
	var model = {};

	/* locations */
	model.locations = [];
	$system.find('locations > location')
		.each(function(index, elem) {
			var $location = $(elem, util.cheerio_opts);
			var atlocs = util.get_children_text($location, 'atlocations');
			var loc = _.extend({},
				$location.attr(),
				{
					atLocations: atlocs
				}
			);
			model.locations.push(loc);
		});

	/* edges */
	model.edges = [];
	$system.find('edges > edge')
		.each(function(index, elem) {
			var $edge = $(elem, util.cheerio_opts);
			var edge = _.extend({},
				$edge.attr(),
				util.children_to_obj($edge, 'source, target')
			);
			model.edges.push(edge);
		});

	/* assets */
	model.assets = [];
	$system.find('assets > item, assets > data')
		.each(function(index, elem) {
			var $asset = $(elem, util.cheerio_opts);
			var asset = _.extend({},
				$asset.attr(),
				{
					type: elem.name,
					atLocations: util.get_children_text($asset, 'atlocations')
				}
			);
			model.assets.push(asset);
		});

	/* actors */
	model.actors = [];
	$system.find('actors > actor')
		.each(function(index, elem) {
			var $actor = $(elem, util.cheerio_opts);
			var actor = _.extend({},
				$actor.attr(),
				{
					atLocations: util.get_children_text($actor, 'atlocations')
				}
			);
			model.actors.push(actor);
		});

	// TODO:
	// - prcesses
	// - policies

	/* predicates */
	model.predicates = [];
	$system.find('predicates > predicate')
		.each(function(index, elem) {
			var $predicate = $(elem, util.cheerio_opts);
			var predicate = _.extend({},
				$predicate.attr(),
				{
					values: util.get_children_text($predicate, 'value')
						.map(function(vals) {
							return vals.split(' ')
						})
				}
			);
			console.log(predicate);
			model.predicates.push(predicate);
		});

	return model;
};
