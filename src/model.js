'use strict';

const _ = require('lodash');
const R = require('ramda');
const cheerio = require('cheerio');
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
	item = _.extend(item || {}, {});
	_validate(item, schemas['item']);
	return add_(model, 'items', item);
};


// ---
// ## `addData`
let addData = module.exports.addData =
function addData(model, data) {
	data = _.extend(data || {}, {});
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
// ---
// ## `singular`
let singular = module.exports.singular =
function singular(plural) {
	return pluralToSingular[plural];
};


// ---
// ## `prepare()`
// > transforms a `selection` to an `Object`
let prepare = module.exports.prepare =
function prepare(
	$system /* selection */
) {
	let model = create();

	// import metadata
	let metadata = {};
	knownAttributes.system
		.forEach(function(attrName) {
			metadata[attrName] = $system.attr(attrName);
		});
	model.system = _.merge(model.system, metadata);
	model.system.title = $system.find('title').text().trim();


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


let separateAttributeFromObject = module.exports.separateAttributeFromObject =
function separateAttributeFromObject(attrNames, obj, attrKey) {
	attrNames = attrNames || [];
	let attrObject = { [attrKey]: R.pick(attrNames, obj) };
	let newObject = R.pick(R.without(attrNames, R.keys(obj)), obj);
	return { newObject, attrObject };
};


const knownAttributes = {
	'system': ['xmlns', 'xmlns:xsi', 'xsi:schemaLocation', 'author', 'version', 'date'],
	'location': ['id'],
	'actor': ['id'],
	'edge': ['directed'],
	'item': ['id', 'name', 'type'],
	'data': ['id', 'name', 'value'],
	'predicate': ['id', 'arity']
};


let objectToArrayOfPrefixedObjects = module.exports.objectToArrayOfPrefixedObjects =
function objectToArrayOfPrefixedObjects(o) {
	return R.keys(o)
		.map(function(prefix) {
			return toPrefixedObject(prefix, o[prefix]);
		});
};


let toPrefixedObject = module.exports.toPrefixedObject =
function toPrefixedObject(prefix, it) {
	return { [prefix]: it };
};


let prepareForXml = module.exports.prepareForXml =
function prepareForXml(o) {
	if (_.isArray(o)) {
		return o.map(prepareForXml);
	}
	else if (_.isString(o) || _.isNumber(o)) {
		return o;
	}
	else if (_.isObject(o)) {
		let a = objectToArrayOfPrefixedObjects(o);
		a = a.map(function(item) {
			let key = R.keys(item)[0];

			let attrObject;
			if (knownAttributes[key]) {
				let sep = separateAttributeFromObject(knownAttributes[key], item[key], attrKey);
				let newObject = sep.newObject;
				attrObject = sep.attrObject;
				item[key] = newObject;
			}

			if (key === 'atLocations') {
				item[key] = item[key].join(' ');
			}

			item[key] = prepareForXml(item[key]);


			// this makes things like
			/*
			<predicate id="isUserIdAt" arity="2">
				<value>big entity_vim.VirtualMachine_vm-47</value>
				<value>big entity_vim.VirtualMachine_vm-55</value>
				<value>big entity_vim.VirtualMachine_vm-102</value>
			</predicate>
			*/
			// happen. (multiple text-only children)
			var firstKey = R.keys(item[key][0])[0];
			if (firstKey) {
				var listOfLiterals =
					item[key][0] // first elem
					[firstKey];
				if (_.isArray(listOfLiterals) && listOfLiterals.length && (_.isString(listOfLiterals[0]) || _.isNumber(listOfLiterals[0]))) {
					item[key] = listOfLiterals.map(function(item) {
						return toPrefixedObject(firstKey, item);
					})
				}
			}


			if (attrObject) {
				item[key] = [attrObject].concat(item[key]);
			}

			// TODO: is there a better solution to this?
			if (item[key][0] && _.isArray(item[key][0]) && item[key][0].length) {
				item[key] = item[key].map(function(e) {
					return e[0];
				});
			}

			return item;
		});
		return a;
	}
	else {
		console.log('not supposed to be here', o);
	}
};


let prepareModelForXml = module.exports.prepareModelForXml =
function prepareModelForXml(model) {
	let system = model.system;

	R.keys(pluralToSingular)
		.forEach(function(collectionName) {
			const prefixFn = R.partial(toPrefixedObject, [singular(collectionName)]);
			if (system[collectionName]) {
				system[collectionName] = system[collectionName]
					.map(prefixFn);
			}
		});

	// separated at birth, but now reunited again
	system.assets = (system.data || []).concat(system.items || []);
	delete system.data;
	delete system.items;
	if (!system.assets.length) {
		delete system.assets;
	}

	return model;
};


// ---
// ## `toXML()`
// > takes a model `Object` and turns it back into XML.
let toXML = module.exports.toXML =
function toXML(
	_model /* Object */
) {
	// duplicate model
	let model = _.merge({}, _model);

	// set fill in the gaps with defaults
	model.system = _.defaults(model.system, {
		'date': moment().format('YYYY-MM-DD HH:mm:ss')
	});

	model = prepareModelForXml(model);
	model = prepareForXml(model);
	let xmlStr = xml(model);

	// return xmlStr;
	return pd.xml(xmlStr)
		.replace(/' {2}'/ig, '\t'); // spaces to tabs
};
