'use strict';

const _ = require('lodash');
const R = require('ramda');
const cheerio = require('cheerio');
const mout = require('mout');
const Joi = require('joi');
const moment = require('moment');
const xml = require('xml');
const pd = require('pretty-data').pd;

const util = require('./util.js');


const attrKey = '_attr';


// ---
// ## `parse()`
// > parse XML with [`cheerio`](https://www.npmjs.com/package/cheerio), so that we can query the model 'jquery-style'.
let parse = module.exports.parse =
function parse(
	xmlStr /* String */
) {
	return cheerio.load(xmlStr, util.cheerioOpts);
};


// ---
// ## `empty`
// > model default structure
const empty = module.exports.empty = {
	system: {
		'xmlns': 'https://www.trespass-project.eu/schemas/TREsPASS_model',
		'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
		'xsi:schemaLocation': 'https://www.trespass-project.eu/schemas/TREsPASS_model.xsd',
		'author': 'trespass.js',
		'version': '0.0.0',
		'title': 'Untitled',
		'date': undefined, // will be filled in on export

		locations: [],
		edges: [],
		// assets: [],
		items: [],
		data: [],
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
let create = module.exports.create =
function create() {
	return _.merge({}, empty);
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

const validationOptions = {
	allowUnknown: true,
};

function _validate(it, schema) {
	const result = Joi.validate(it, schema, validationOptions);
	if (result.error) {
		console.error(result.error);
	}
}


// ---
// ## `add_`
let add_ = module.exports.add_ =
function add_(model, dest, item) {
	if (!model.system[dest]) {
		model.system[dest] = [];
	}
	model.system[dest].push(item);
	return model;
};


// ---
// ## `addActor`
let addActor = module.exports.addActor =
function addActor(model, actor) {
	actor = _.extend(actor || {}, {});
	_validate(actor, schemas['actor']);
	return add_(model, 'actors', actor);
};


// ---
// ## `addItem`
let addItem = module.exports.addItem =
function addItem(model, item) {
	item = _.extend(item || {}, {
		// '@_type': 'item'
	});
	_validate(item, schemas['item']);
	return add_(model, 'items', item);
};


// ---
// ## `addData`
let addData = module.exports.addData =
function addData(model, data) {
	data = _.extend(data || {}, {
		// '@_type': 'data'
	});
	_validate(data, schemas['data']);
	return add_(model, 'data', data);
};


// ---
// ## `addEdge`
let addEdge = module.exports.addEdge =
function addEdge(model, edge) {
	edge = _.defaults(edge || {}, {
		directed: false
	});
	edge = _.extend(edge || {}, {});
	_validate(edge, schemas['edge']);
	return add_(model, 'edges', edge);
};


// ---
// ## `addPolicy`
let addPolicy = module.exports.addPolicy =
function addPolicy(model, policy) {
	// TODO

	// _validate(edge, schemas['policy']);
	return add_(model, 'policies', policy);
};


// ---
// ## `addPredicate`
let addPredicate = module.exports.addPredicate =
function addPredicate(model, predicate) {
	// TODO

	// _validate(edge, schemas['predicate']);
	return add_(model, 'predicates', predicate);
};


// ---
// ## `addProcess`
let addProcess = module.exports.addProcess =
function addProcess(model, process) {
	// TODO

	// _validate(edge, schemas['process']);
	// return add_(model, 'processes', process);
	console.warn('addProcess() is not implemented yet'); // TODO
};


// ---
// ## `addRole`
let addRole = module.exports.addRole =
function addRole(model, role) {
	// TODO

	// _validate(edge, schemas['role']);
	// return add_(model, 'roles', role);
	console.warn('addRole() is not implemented yet'); // TODO
};


// ---
// ## `addLocation`
let addLocation = module.exports.addLocation =
function addLocation(model, location) {
	location = _.extend(location || {}, {});
	_validate(location, schemas['location']);
	return add_(model, 'locations', location);
};


// ---
// ## `addRoom`
let addRoom = module.exports.addRoom =
function addRoom(model, room) {
	room = _.extend(room || {}, {
		// domain: 'physical'
	});
	return addLocation(model, room);
};



// ---
// ## `singular`
let singular = module.exports.singular =
function singular(plural) {
	const pluralToSingular = {
		'actors': 'actor',
		// 'assets': 'asset',
		'items': 'item',
		'data': 'data',
		'edges': 'edge',
		'locations': 'location',
		'policies': 'policy',
		'predicates': 'predicate',
		'processes': 'process',
		'roles': 'role',
	};
	return pluralToSingular[plural] || plural;
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

let getLocations = module.exports.getLocations =
function getLocations(model) {
	return get_(model, 'locations');
};

let getPredicates = module.exports.getPredicates =
function getPredicates(model) {
	return get_(model, 'predicates');
};

let getAssets = module.exports.getAssets =
function getAssets(model) {
	return model.system.assets;
};
let getData = module.exports.getData =
function getData(model) {
	return R.filter(
		R.has('data'),
		getAssets(model)
	);
};
let getItems = module.exports.getItems =
function getItems(model) {
	return R.filter(
		R.has('item'),
		getAssets(model)
	);
};


// ---
// ## `prepare()`
// > transforms a `selection` to an `Object`
let prepare = module.exports.prepare =
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
			let atLocations = util.getChildrenText($item, 'atlocations');
			if (atLocations.length) {
				atLocations = atLocations[0].split(/\s+/i);
			}
			return _.merge(item, {
				atLocations: atLocations
			});
		},
		addLocation
	);

	/* edges */
	process(
		$system.find('edges > edge'),
		function($item, item) {
			return _.merge(item, util.childrenToObj($item, 'source, target'));
		},
		addEdge
	);

	/* assets */
	process(
		$system.find('assets > item'),
		function($item, item) {
			let atLocations = util.getChildrenText($item, 'atlocations');
			if (atLocations.length) {
				atLocations = atLocations[0].split(/\s+/i);
			}
			return _.merge(item, {
				atLocations: atLocations
			});
		},
		addItem
	);
	process(
		$system.find('assets > data'),
		function($item, item) {
			let atLocations = util.getChildrenText($item, 'atlocations');
			if (atLocations.length) {
				atLocations = atLocations[0].split(/\s+/i);
			}
			return _.merge(item, {
				atLocations: atLocations
			});
		},
		addData
	);

	/* actors */
	process(
		$system.find('actors > actor'),
		function($item, item) {
			let atLocations = util.getChildrenText($item, 'atlocations');
			if (atLocations.length) {
				atLocations = atLocations[0].split(/\s+/i);
			}
			return _.merge(item, {
				atLocations: atLocations
			});
		},
		addActor
	);

	/* predicates */
	process(
		$system.find('predicates > predicate'),
		function($item, item) {
			let values = util.getChildrenText($item, 'value');
			return _.merge(item, {
				// values: values.map(function(value) {
				// 	return { value: value };
				// })
				value: values
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


let makeAttributes = module.exports.makeAttributes =
function makeAttributes(attrNames, obj) {
	if (!attrNames || !attrNames.length) { return obj; }

	let attrs = {};
	attrNames.forEach(function(name) {
		if (obj[name] !== undefined) { // TODO: test this
			attrs[name] = obj[name];
			delete obj[name];
		}
	});
	obj[attrKey] = attrs;
	return obj;
}


let prepareForXml = module.exports.prepareForXml =
function prepareForXml(obj) {
	const keys = R.keys(obj);
	if (keys.length === 1) {
		const elemName = keys[0];

		let knownAttributes = [];
		if (elemName === 'system') {
			knownAttributes = ['xmlns', 'xmlns:xsi', 'xsi:schemaLocation', 'author', 'version', 'date'];
		} else if (elemName === 'location') {
			knownAttributes = ['id'];
		} else if (elemName === 'actor') {
			knownAttributes = ['id'];
		} else if (elemName === 'edge') {
			knownAttributes = ['directed'];
		} else if (elemName === 'item') {
			knownAttributes = ['id', 'name'];
		} else if (elemName === 'data') {
			knownAttributes = ['id', 'name', 'value'];
		} else if (elemName === 'predicate') {
			knownAttributes = ['id', 'arity'];
		}

		obj[elemName] = makeAttributes(knownAttributes, obj[elemName]);

		R.without([attrKey, charKey], R.keys(obj[elemName]))
			.forEach(function(key) {
				const child = obj[elemName][key];
				let items = [];
				if (_.isArray(child)) {
					items = child;
				} else if (_.isObject(child)) {
					items = [child];
				}
				items.forEach(prepareForXml);
			});
	}
}


// ---
// ## `xmlify()`
// > takes a model `Object` and turns it back into XML.
let xmlify = module.exports.xmlify =
function xmlify(
	_model /* Object */
) {
	// duplicate model
	let model = _.merge({}, _model);

	// set fill in the gaps with defaults
	model.system = _.defaults(model.system, {
		'date': moment().format('DD-MM-YYYY')
	});

	prepareForXml(model);
	// console.log( JSON.stringify(model) );

	const builder = new xml2js.Builder({
		attrkey: attrKey,
		charKey: charKey,
	});
	const xml = builder.buildObject(model);
	return pd.xml(xml)
		.replace(/' {2}'/ig, '\t') // spaces to tabs
};
