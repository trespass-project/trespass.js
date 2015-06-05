var _ = require('lodash');
var cheerio = $ = require('cheerio'); $ = undefined;
var mout = require('mout');
var schema = require('validate');
var xmlbuilder = require('xmlbuilder');
var moment = require('moment');
var pd = require('pretty-data').pd;

var util = require('./util.js');


// ---
// ## `parse()`
// > parse XML with [`cheerio`](https://www.npmjs.com/package/cheerio), so that we can query the model 'jquery-style'.
module.exports.parse =
parse = function(
	xml_str /* String */
) {
	return cheerio.load(xml_str, util.cheerio_opts);
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
		'title': 'ANM-generated TREsPASS model',
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
// ## `create`
// > return a new, empty model object
var create =
module.exports.create = function() {
	var model = _.merge({}, empty);


	return model;
};


// element schema definitions for input validation
var schemas = {};
schemas.location = schema({
	'id': {
		type: 'string',
		required: true
	},
	'domain': {
		type: 'string',
		match: /^physical$/i,
		required: true
	},
	'atLocations': {
		// type: 'array',
		// required: false,
		// each: _.isString

		// while waiting for a reply to
		// https://github.com/eivindfjeldstad/validate/issues/22
		use: function(it) {
			if (it === undefined) return true; // optional

			if (!_.isArray(it)) return false;
			var result = true;
			result = it.reduce(function(prev, item) {
				return prev && _.isString(item);
			}, result);
			return result;
		}
	}
});
schemas.actor = schema({
	'id': {
		type: 'string',
		required: true
	},
	'atLocations': {
		type: 'array',
		required: true,
		each: _.isString
	}
});
schemas.item = schema({
	'id': {
		type: 'string',
		required: true
	},
	'name': {
		type: 'string',
		required: true
	}
});
schemas.data = schema({
	'id': {
		type: 'string',
		required: true
	},
	'name': {
		type: 'string',
		required: true
	},
	'value': {
		type: 'string',
		required: true
	}
});


// ---
// ## `add_`
var add_ =
module.exports.add_ = function(model, dest, item) {
	model.system[dest].push(item);
	return model;
};


// ---
// ## `addActor`
var addActor =
module.exports.addActor = function(model, actor) {
	actor = _.extend(actor || {}, {});

	var errors = schemas['actor'].validate(actor, { strip: false });
	if (errors.length > 0) {
		throw new Error(errors[0]);
		return;
	}

	return add_(model, 'actors', actor);
};


// ---
// ## `addItem`
var addItem =
module.exports.addItem = function(model, item) {
	item = _.extend(item || {}, {
		type: 'item'
	});

	var errors = schemas['item'].validate(item, { strip: false });
	if (errors.length > 0) {
		throw new Error(errors[0]);
		return;
	}

	return add_(model, 'assets', item);
};


// ---
// ## `addData`
var addData =
module.exports.addData = function(model, data) {
	data = _.extend(data || {}, {
		type: 'data'
	});

	var errors = schemas['data'].validate(data, { strip: false });
	if (errors.length > 0) {
		throw new Error(errors[0]);
		return;
	}

	return add_(model, 'assets', data);
};


// ---
// ## `addLocation`
var addLocation =
module.exports.addLocation = function(model, location) {
	location = _.extend(location || {}, {
		domain: 'physical'
	});

	var errors = schemas['location'].validate(location, { strip: false });
	if (errors.length > 0) {
		throw new Error(errors[0]);
		return;
	}

	return add_(model, 'locations', location);
};


// ---
// ## `addRoom`
var addRoom =
module.exports.addRoom = function(model, room) {
	return addLocation(model, room);
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
			var $item = $system.find(this);
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
		'xsi:schemaLocation',
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
					return;
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
					if (key[0] === '@') {
						// has explicitely been marked as attribute
					} else if (attrib_names.indexOf(key) > -1) {
						// has been listed as attribute
						parent['@'+key] = parent[key];
						delete parent[key];
					} else {
						// everything else is text
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
	var $ = parse(xml_str);
	var $system = $('system');
	util.unwrap_rename($system.find('atLocations > atLocation'), 'atLocations');
	util.unwrap_rename($system.find('predicate > values > value'));
	$system.find('asset > type')
		.each(function() {
			var $this = $system.find(this);
			var $parent = $this.parent();
			var type = $this.text();
			$this.remove();
			util.rename_tag($parent, type);
		});

	return pd.xml($.xml()).replace(/  /ig, '\t'); /* String */
};
