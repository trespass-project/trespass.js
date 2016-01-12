'use strict';

const _ = require('lodash');
const R = require('ramda');
const cheerio = require('cheerio');
const mout = require('mout');
const Joi = require('joi');
const moment = require('moment');
const etree = require('elementtree');
const pd = require('pretty-data').pd;

const util = require('./util.js');


// ---
// ## `parse()`
// > parse XML with [`cheerio`](https://www.npmjs.com/package/cheerio), so that we can query the model 'jquery-style'.
let parse =
module.exports.parse =
function parse(
	xml_str /* String */
) {
	return cheerio.load(xml_str, util.cheerio_opts);
};


// ---
// ## `empty`
// > model default structure
const empty =
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
let create =
module.exports.create =
function create() {
	const model = _.merge({}, empty);
	return model;
};


// element schema definitions for input validation
let schemas = {};
schemas.location = Joi.object().keys({
	'id': Joi.string()/*.required()*/,
	'domain': Joi.string()/*.required()*/,
	'atLocations': Joi.array().items(Joi.string()).optional()
});
schemas.actor = Joi.object().keys({
	'id': Joi.string()/*.required()*/,
	'atLocations': Joi.array().items(Joi.string())/*.required()*/
});
schemas.item = Joi.object().keys({
	'id': Joi.string()/*.required()*/,
	'name': Joi.string()/*.required()*/
});
schemas.data = Joi.object().keys({
	'id': Joi.string()/*.required()*/,
	'name': Joi.string()/*.required()*/,
	'value': Joi.string()/*.required()*/
});
schemas.edge = Joi.object().keys({
	'source': Joi.string()/*.required()*/,
	'target': Joi.string()/*.required()*/,
	'directed': Joi.boolean().optional()
});

const validation_options = {
	allowUnknown: true,
};

function _validate(it, schema) {
	const result = Joi.validate(it, schema, validation_options);
	if (result.error) { throw result.error; }
}


// ---
// ## `add_`
let add_ =
module.exports.add_ =
function add_(model, dest, item) {
	model.system[dest].push(item);
	return model;
};


// ---
// ## `addAsset`
let addAsset =
module.exports.addAsset =
function addAsset(model, asset) {
	asset = _.extend(asset || {}, {});

	// _validate(asset, schemas['asset']);
	return add_(model, 'assets', { item: asset });
};


// ---
// ## `addActor`
let addActor =
module.exports.addActor =
function addActor(model, actor) {
	actor = _.extend(actor || {}, {});

	_validate(actor, schemas['actor']);
	return add_(model, 'actors', { actor: actor });
};


// ---
// ## `addItem`
let addItem =
module.exports.addItem =
function addItem(model, item) {
	item = _.extend(item || {}, {
		// '@_type': 'item'
	});

	_validate(item, schemas['item']);
	return add_(model, 'assets', { item: item });
};


// ---
// ## `addData`
let addData =
module.exports.addData =
function addData(model, data) {
	data = _.extend(data || {}, {
		// '@_type': 'data'
	});

	_validate(data, schemas['data']);
	return add_(model, 'assets', { data: data });
};


// ---
// ## `addEdge`
let addEdge =
module.exports.addEdge =
function addEdge(model, edge) {
	edge = _.defaults(edge || {}, {
		directed: false
	});
	edge = _.extend(edge || {}, {});

	_validate(edge, schemas['edge']);
	return add_(model, 'edges', { edge: edge });
};


// ---
// ## `addPolicy`
let addPolicy =
module.exports.addPolicy =
function addPolicy(model, policy) {
	// TODO

	// _validate(edge, schemas['policy']);
	return add_(model, 'policies', { policy: policy });
};


// ---
// ## `addPredicate`
let addPredicate =
module.exports.addPredicate =
function addPredicate(model, predicate) {
	// TODO

	// _validate(edge, schemas['predicate']);
	return add_(model, 'predicates', { predicate: predicate });
};


// ---
// ## `addProcess`
let addProcess =
module.exports.addProcess =
function addProcess(model, process) {
	// TODO

	// _validate(edge, schemas['process']);
	// return add_(model, 'processes', { process: process });
	console.warn('addProcess() is not implemented yet'); // TODO
};


// ---
// ## `addRole`
let addRole =
module.exports.addRole =
function addRole(model, role) {
	// TODO

	// _validate(edge, schemas['role']);
	// return add_(model, 'roles', { role: role });
	console.warn('addRole() is not implemented yet'); // TODO
};


// ---
// ## `addLocation`
let addLocation =
module.exports.addLocation =
function addLocation(model, location) {
	location = _.extend(location || {}, {});

	_validate(location, schemas['location']);
	return add_(model, 'locations', { location: location });
};


// ---
// ## `addRoom`
let addRoom =
module.exports.addRoom =
function addRoom(model, room) {
	room = _.extend(room || {}, {
		// domain: 'physical'
	});
	return addLocation(model, room);
};



// ---
// ## `singular`
let singular =
module.exports.singular =
function singular(plural) {
	const snglr = {
		'actors': 'actor',
		'assets': 'asset',
		'edges': 'edge',
		'locations': 'location',
		'policies': 'policy',
		'predicates': 'predicate',
		'processes': 'process',
		'roles': 'role',
	};
	return snglr[plural] || plural;
};


function get_(model, what) {
	if (!model.system[what]) {
		throw new Error('model.system.'+what+' doesn\'t exist');
	}
	if (!singular(what)) {
		throw new Error('unknown: '+what);
	}
	return model.system[what].map( R.prop(singular(what)) );
}

let getLocations =
module.exports.getLocations =
function getLocations(model) {
	return get_(model, 'locations');
};

let getPredicates =
module.exports.getPredicates =
function getPredicates(model) {
	return get_(model, 'predicates');
};

let getAssets =
module.exports.getAssets =
function getAssets(model) {
	return model.system.assets;
};
let getData =
module.exports.getData =
function getData(model) {
	return R.filter(
		R.has('data'),
		getAssets(model)
	);
};
let getItems =
module.exports.getItems =
function getItems(model) {
	return R.filter(
		R.has('item'),
		getAssets(model)
	);
};


// ---
// ## `prepare()`
// > transforms a `selection` to an `Object`
let prepare =
module.exports.prepare =
function prepare(
	$system /* selection */
) {
	let model = create();

	function process($selection, fn, addFn) {
		$selection.each(function(index, elem) {
			let $item = $system.find(this);
			let item = _.merge({}, $item.attr());
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
				// '@_type': $item[0].name,
				atLocations: util.get_children_text($item, 'atlocations')
			});
		},
		addItem
	);
	process(
		$system.find('assets > data'),
		function($item, item) {
			return _.merge(item, {
				// '@_type': $item[0].name,
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

	/* predicates */
	process(
		$system.find('predicates > predicate'),
		function($item, item) {
			let values = util.get_children_text($item, 'value');
			return _.merge(item, {
				values: values.map(function(value) { return { value: value }; })
			});
		},
		addPredicate
	);

	// <todo>
	// TODO:
	// - processes
	// - policies

	return model;
};


// ---
// ## `xmlify()`
// > takes a model `Object` and turns it back into XML.
let xmlify =
module.exports.xmlify =
function xmlify(
	_model /* Object */
) {
	// duplicate model
	let model = _.merge({}, _model);
	// set fill in the gaps with defaults
	model.system = _.defaults(model.system, {
		'date': moment().format('DD-MM-YYYY')
	});

	let knownAttributes = {
		'model.system': ['xmlns', 'xmlns:xsi', 'xsi:schemaLocation', 'author', 'version', /*'title',*/ 'date'],
		'model.system.locations.location': ['domain', 'id'],
		'model.system.actors.actor': ['id'],
		'model.system.edges.edge': ['directed'],
		'model.system.assets.item': ['id', 'name', 'value', 'type', 'label'],
		'model.system.assets.data': ['id', 'name', 'value', 'type', 'label'],
		'model.system.predicates.predicate': ['id', 'arity', 'type', 'label', 'value'],
	};

	function isAttribute(key, path, attributes) {
		return mout.string.startsWith(key, '@') // you can explicitely use @ for unknown attribs
			|| mout.array.contains(attributes[path], key);
	}

	function recursivelyToXML(parent, parentElem, depth, path) {
		depth = depth || 0;

		delete parent.type; // TODO: predicates need `type`
		if (parent._type) { parent.type = parent._type; }

		_.keys(parent)
			.forEach(function(key) {
				// console.log(mout.string.repeat('\t', depth) + key);
				let child = parent[key];

				if (isAttribute(key, path, knownAttributes)) {
					parentElem.set(key.replace('@', ''), child);
				} else {
					// `child` is either another `Object`, an `Array`, or a `literal`
					if (_.isString(child) || _.isNumber(child)) {
						if (!_.isEmpty(child)) {
							let childElem = etree.SubElement(parentElem, key);
							childElem.text = child;
						}
					}
					else if (_.isArray(child)) {
						let texts = [];
						let childElem;

						if (key === '__') {
							console.log(parentElem);
							child.forEach(function(child) {
								let childElem = etree.SubElement(parentElem, 'value');
								childElem.text = child.value;
							});
						}
						else if (!_.isEmpty(child)) {
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
							let childElem = etree.SubElement(parentElem, key);
							recursivelyToXML(child, childElem, depth+1, path+'.'+key);
						}
					}

				}
			});
	}

	let system = etree.Element('system');
	recursivelyToXML(model.system, system, 0, 'model.system');

	let tree = new etree.ElementTree(system);
	let xml = tree.write();
	return pd.xml(xml)
		.replace(/' {2}'/ig, '\t')
		.replace(/http:\/\/zurich.ibm.com\/save\/ontology\/vmware\//ig, ''); // TODO:
};
