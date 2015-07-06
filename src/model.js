var _ = require('lodash');
var R = require('ramda');
var cheerio = $ = require('cheerio'); $ = undefined;
var mout = require('mout');
var Joi = require('joi');
var moment = require('moment');
var etree = require('elementtree');
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
		roles: [],
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
schemas.location = Joi.object().keys({
	'id': Joi.string().required(),
	'domain': Joi.string().required(),
	'atLocations': Joi.array().items(Joi.string()).optional()
});
schemas.actor = Joi.object().keys({
	'id': Joi.string().required(),
	'atLocations': Joi.array().items(Joi.string()).required()
});
schemas.item = Joi.object().keys({
	'id': Joi.string().required(),
	'name': Joi.string().required()
});
schemas.data = Joi.object().keys({
	'id': Joi.string().required(),
	'name': Joi.string().required(),
	'value': Joi.string().required()
});
schemas.edge = Joi.object().keys({
	'source': Joi.string().required(),
	'target': Joi.string().required(),
	'directed': Joi.boolean().optional()
});

var validation_options = {
	allowUnknown: true,
};

function _validate(it, schema) {
	var result = Joi.validate(it, schema, validation_options);
	if (result.error) { throw result.error; }
}


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

	_validate(actor, schemas['actor']);
	return add_(model, 'actors', { actor: actor });
};


// ---
// ## `addItem`
var addItem =
module.exports.addItem = function(model, item) {
	item = _.extend(item || {}, {
		'@_type': 'item'
	});

	_validate(item, schemas['item']);
	return add_(model, 'assets', { item: item });
};


// ---
// ## `addData`
var addData =
module.exports.addData = function(model, data) {
	data = _.extend(data || {}, {
		'@_type': 'data'
	});

	_validate(data, schemas['data']);
	return add_(model, 'assets', { data: data });
};


// ---
// ## `addEdge`
var addEdge =
module.exports.addEdge = function(model, edge) {
	edge = _.defaults(edge || {}, {
		directed: false
	});
	edge = _.extend(edge || {}, {});

	_validate(edge, schemas['edge']);
	return add_(model, 'edges', { edge: edge });
};


// ---
// ## `addPolicy`
var addPolicy =
module.exports.addPolicy = function(model, policy) {
	// TODO

	// _validate(edge, schemas['policy']);
	return add_(model, 'policies', { policy: policy });
};


// ---
// ## `addPredicate`
var addPredicate =
module.exports.addPredicate = function(model, predicate) {
	// TODO

	// _validate(edge, schemas['predicate']);
	return add_(model, 'predicates', { predicate: predicate });
};


// ---
// ## `addLocation`
var addLocation =
module.exports.addLocation = function(model, location) {
	location = _.extend(location || {}, {});

	_validate(location, schemas['location']);
	return add_(model, 'locations', { location: location });
};


// ---
// ## `addRoom`
var addRoom =
module.exports.addRoom = function(model, room) {
	room = _.extend(room || {}, {
		domain: 'physical'
	});
	return addLocation(model, room);
};



var singular = {
	'locations': 'location',
	'actors': 'actor',
	'edges': 'edge',
	'predicates': 'predicate',
};

function get_(model, what) {
	// TODO: error handling
	return model.system[what].map( R.prop(singular[what]) );
}

var getLocations =
module.exports.getLocations = function(model) {
	return get_(model, 'locations');
};

var getPredicates =
module.exports.getPredicates = function(model) {
	return get_(model, 'predicates');
};

var getAssets =
module.exports.getAssets = function(model) {
	return model.system.assets;
};
var getData =
module.exports.getData = function(model) {
	return R.filter(
		R.has('data'),
		getAssets(model)
	);
};
var getItems =
module.exports.getItems = function(model) {
	return R.filter(
		R.has('item'),
		getAssets(model)
	);
};


// ---
// ## `prepare()`
// > transforms a `selection` to an `Object`
module.exports.prepare =
prepare = function(
	$system /* selection */
) {
	var model = create();

	function process($selection, fn, addFn) {
		$selection.each(function(index, elem) {
			var $item = $system.find(this);
			var item = _.merge({}, $item.attr());
			item = fn($item, item);
			addFn(model, item);
		});
	}

	/* locations */
	process(
		$system.find('locations > location'),
		function($item, item) {
			return _.merge(item, {
				atLocations: util.get_children_text($item, 'atlocations')
			});
		},
		addLocation
	);

	/* edges */
	process(
		$system.find('edges > edge'),
		function($item, item) {
			return _.merge(item, util.children_to_obj($item, 'source, target'));
		},
		addEdge
	);

	/* assets */
	process(
		$system.find('assets > item'),
		function($item, item) {
			return _.merge(item, {
				'@_type': $item[0].name,
				atLocations: util.get_children_text($item, 'atlocations')
			});
		},
		addItem
	);
	process(
		$system.find('assets > data'),
		function($item, item) {
			return _.merge(item, {
				'@_type': $item[0].name,
				atLocations: util.get_children_text($item, 'atlocations')
			});
		},
		addData
	);

	/* actors */
	process(
		$system.find('actors > actor'),
		function($item, item) {
			return _.merge(item, {
				atLocations: util.get_children_text($item, 'atlocations')
			});
		},
		addActor
	);

	// <todo>
	// TODO:
	// - processes
	// - policies

	/* predicates */
	process(
		$system.find('predicates > predicate'),
		function($item, item) {
			var values = util.get_children_text($item, 'value');
			return _.merge(item, {
				values: values.map(function(value) { return { value: value }; })
			});
		},
		addPredicate
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

	var knownAttributes = {
		'model.system': ['xmlns', 'xmlns:xsi', 'xsi:schemaLocation', 'author', 'version', 'title', 'date'],
		'model.system.locations.location': ['domain', 'id'],
		'model.system.actors.actor': ['id'],
		'model.system.edges.edge': ['directed'],
		'model.system.assets.item': ['id', 'name', 'value'],
		'model.system.assets.data': ['id', 'name', 'value'],
		'model.system.predicates.predicate': ['id', 'arity'],
	};

	function isAttribute(key, path, attributes) {
		return mout.string.startsWith(key, '@') // you can explicitely use @ for unknown attribs
			|| mout.array.contains(attributes[path], key);
	}

	function recursivelyToXML(parent, parentElem, depth, path) {
		depth = depth || 0;

		_.keys(parent)
			.forEach(function(key) {
				// console.log(mout.string.repeat('\t', depth) + key);
				var child = parent[key];

				if (isAttribute(key, path, knownAttributes)) {
					parentElem.set(key.replace('@', ''), child);
				} else {


					// `child` is either another `Object`, an `Array`, or a `literal`
					if (_.isString(child) || _.isNumber(child)) {
						if (!_.isEmpty(child)) {
							var childElem = etree.SubElement(parentElem, key);
							childElem.text = child;
						}
					}
					else if (_.isArray(child)) {
						var texts = [];

						var childElem;
						if (!_.isEmpty(child)) {
							childElem = etree.SubElement(parentElem, key);
							child.forEach(function(child) {
								if (!_.isObject(child)) {
									texts.push(''+child);
								} else {
									recursivelyToXML(child, childElem, depth+1, path+'.'+key);
								}
							});
						}

						if (!_.isEmpty(texts)) {
							if (!childElem){
								childElem = etree.SubElement(parentElem, key);
							}
							childElem.text = texts.join(' ');
						}
					}
					else if (_.isObject(child)) {
						if (!_.isEmpty(child)) {
							var childElem = etree.SubElement(parentElem, key);
							recursivelyToXML(child, childElem, depth+1, path+'.'+key);
						}
					}

				}
			});
	}

	var system = etree.Element('system');
	recursivelyToXML(model.system, system, 0, 'model.system');

	var tree = new etree.ElementTree(system);
	var xml = tree.write();
	return pd.xml(xml).replace('  ', '\t');
};
