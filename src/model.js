var _ = require('lodash');
var cheerio = $ = require('cheerio');
var xmlbuilder = require('xmlbuilder');
var moment = require('moment');
var pd = require('pretty-data').pd;

var util = require('./util.js');


// ---
// ## `parse()`
// > parse XML with [`cheerio`](https://www.npmjs.com/package/cheerio), so that we can query the model 'jquery-style'.
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
// ## `empty`
// > model default structure
var empty =
module.exports.empty = {
	system: {
		'xmlns': 'https://www.trespass-project.eu/schemas/TREsPASS_model',
		'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
		'xsi:schemaLocation': 'https://www.trespass-project.eu/schemas/TREsPASS_model.xsd',
		'author': 'attack navigator map (trespass.js)',
		'version': '0.0.0',
		'title': 'ANM-generated TREsPASS model'
		'date': undefined, // will be filled in on export

		locations: [],
		edges: [],
		assets: [],
		actors: [],
		predicates: [],
		processes: [],
		policies: []
	}
};


// ---
// ## `prepare()`
// > transforms a `selection` to an `Object`
module.exports.prepare =
prepare = function(
	$system /* selection */
) {
	var model = _.merge({}, empty);

	function process($selection, fn, destination) {
		$selection.each(function(index, elem) {
			var $item = $(elem, util.cheerio_opts);
			var item = _.merge({}, $item.attr());
			fn($item, item);
			destination.push(item);
		});
	}

	/* locations */
	process(
		$system.find('locations > location'),
		function($item, item) {
			_.merge(item, {
				atLocations: util.get_children_text($item, 'atlocations')
			});
		},
		model.system.locations
	);

	/* edges */
	process(
		$system.find('edges > edge'),
		function($item, item) {
			_.merge(item, util.children_to_obj($item, 'source, target'));
		},
		model.system.edges
	);

	/* assets */
	process(
		$system.find('assets > item, assets > data'),
		function($item, item) {
			_.merge(item, {
				type: $item[0].name,
				atLocations: util.get_children_text($item, 'atlocations')
			});
		},
		model.system.assets
	);

	/* actors */
	process(
		$system.find('actors > actor'),
		function($item, item) {
			_.merge(item, {
				atLocations: util.get_children_text($item, 'atlocations')
			});
		},
		model.system.actors
	);

	// <todo>
	// TODO:
	// - processes
	// - policies

	/* predicates */
	process(
		$system.find('predicates > predicate'),
		function($item, item) {
			_.merge(item, {
				values: util.get_children_text($item, 'value')
					/*.map(function(vals) {
						return vals.split(' ');
					})*/
			});
		},
		model.system.predicates
	);

	return model;
};


// ---
// ## `xmlify()`
// > takes a model `Object` and turns it back into XML.
var xmlify =
module.exports.xmlify = function(
	model /* Object */
) {
	// duplicate model
	var model = _.merge({}, model);
	// set fill in the gaps with defaults
	model.system = _.defaults(model.system, {
		'date': moment().format('DD-MM-YYYY')
	});

	function text_to_elem(item) {
		return { '#text': item };
	}

	function array_to_elems(list) {
		return { '#list': list }
	}

	var attrib_names = [
		'xmlns',
		'xmlns:xsi',
		'xsi:schemaLocation'
		'author',
		'date',
		'version',
		'title',
		'id',
		'domain',
		'directed',
		'name',
		'value',
		'arity'
	];

	function traverse(parent, path) {
		path = path || '';
		_.keys(parent)
			.forEach(function(key) {
				var child = parent[key];
				var _path = path + '/' + key;

				if (key[0] === '_') {
					delete parent[key];
				}

				// `child` is either another `Object`, an `Array`, or a `literal`
				if (_.isArray(child)) {
					if (child.length === 0) {
						// delete empty arrays
						delete parent[key];
					} else {
						parent[key] = array_to_elems(child)['#list']
							.map(function(item) {
								var obj = {};
								// default name is singular of parent
								obj[key.substr(0, key.length-1)] = item;
								return obj;
							});
					}
					traverse(child, _path);
				}
				else if (_.isObject(child)) {
					traverse(child, _path);
				}
				else {
					// literals are either attributes or text nodes
					if (attrib_names.indexOf(key) > -1) {
						parent['@'+key] = parent[key];
						delete parent[key];
					} else {
						parent[key] = text_to_elem(parent[key]);
					}
				}
			});
	}

	traverse(model);

	var xml = xmlbuilder.create(model);
	var xml_str = '<?xml version="1.0" encoding="UTF-8"?>\n' + xml.toString();

	// post-processing:<br>
	// since the model is not a 1:1 representation of the input XML, the exceptions from `prepare()` are reversed here.
	var $ = cheerio.load(xml_str, util.cheerio_opts);
	util.unwrap_rename('atLocations > atLocation', 'atLocations');
	util.unwrap_rename('predicate > values > value');
	$('asset > type')
		.each(function() {
			var $this = $(this);
			var $parent = $this.parent();
			var type = $this.text();
			$this.remove();
			util.rename_tag($parent, type);
		});

	return pd.xml($.xml()).replace(/  /ig, '\t'); /* String */
};
