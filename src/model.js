'use strict';

const _ = require('lodash');
const R = require('ramda');
const Joi = require('joi');
const async = require('async');
const moment = require('moment');
const parseString = require('xml2js').parseString;
const xml2js = require('xml2js');
const pd = require('pretty-data').pd;

const util = require('./util.js');


const attrKey = '_attr';
const charKey = '_text';
const xml2jsOptions = {
	attrkey: attrKey,
	charkey: charKey,
	trim: true,
	explicitArray: /*true*/ false,
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
// ## `parse()`
// > parse XML with [`cheerio`](https://www.npmjs.com/package/cheerio), so that we can query the model 'jquery-style'.
let parse = module.exports.parse =
function parse(
	xmlStr, /* String */
	done /* Function */
) {
	function mergeAttributes(obj) {
		const attributes = obj[attrKey];
		const withoutAttributes = R.omit([attrKey], obj);
		return _.merge({}, withoutAttributes, attributes);
	}

	function recurse(item, key) {
		if (_.isArray(item)) {
			return item
				.map(function(arrItem) {
					return recurse(arrItem);
				});
		}
		else if (_.isString(item)) {
			item = item
				.replace(/[\r\n\t]/ig, ' ')
				.replace(/ +/ig, ' ');

			if (key === 'atLocations') {
				item = item.split(' ');
			}

			return item;
		}
		else if (_.isNumber(item)) {
			return item;
		}
		else if (_.isObject(item)) {
			item = mergeAttributes(item);
			R.keys(item)
				.forEach(function(key) {
					item[key] = recurse(item[key], key);
				});
			return item;
		}
	}

	let model = create();
	let parsed;

	async.series(
		[
			function(cb) { // parse
				parseString(xmlStr, xml2jsOptions, function(err, _parsed) {
					if (err) {
						return cb(err);
					}
					parsed = _parsed;
					cb(null);
				});
			},

			function(cb) { // metadata
				const metadata = parsed.system[attrKey];
				model.system = _.merge(model.system, metadata);
				cb(null);
			},

			function(cb) { // title
				model.system = _.merge(model.system, { title: parsed.system.title });
				cb(null, model);
			},

			function(cb) { // all the rest
				const mapping = [
					{
						singular: 'actor',
						plural: 'actors',
						collection: 'actors'
					},
					{
						singular: 'edge',
						plural: 'edges',
						collection: 'edges'
					},
					{
						singular: 'location',
						plural: 'locations',
						collection: 'locations'
					},
					{
						singular: 'policy',
						plural: 'policies',
						collection: 'policies'
					},
					{
						singular: 'predicate',
						plural: 'predicates',
						collection: 'predicates'
					},
					{
						singular: 'process',
						plural: 'processes',
						collection: 'processes'
					},
					{
						singular: 'role',
						plural: 'roles',
						collection: 'roles'
					},

					{
						singular: 'item',
						plural: 'assets',
						collection: 'items'
					},
					{
						singular: 'data',
						plural: 'assets',
						collection: 'data'
					}
				];

				mapping.forEach(function(item) {
					if (parsed.system[item.plural]) {
						if (!_.isArray(parsed.system[item.plural][item.singular])) {
							parsed.system[item.plural][item.singular] =
								[ parsed.system[item.plural][item.singular] ];
						}
						model.system[item.collection] =
							recurse(parsed.system[item.plural][item.singular]);
					}
				});

				cb(null, model);
			},
		],

		function(err) {
			if (err) {
				console.error(err);
			}
			done(err, model);
		}
	);
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
	// _validate(actor, schemas['actor']);
	return add_(model, 'actors', actor);
};


// ---
// ## `addItem`
let addItem = module.exports.addItem =
function addItem(model, item) {
	item = _.extend(item || {}, {});
	// _validate(item, schemas['item']);
	return add_(model, 'items', item);
};


// ---
// ## `addData`
let addData = module.exports.addData =
function addData(model, data) {
	data = _.extend(data || {}, {});
	// _validate(data, schemas['data']);
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
	// _validate(edge, schemas['edge']);
	return add_(model, 'edges', edge);
};


// ---
// ## `addPolicy`
let addPolicy = module.exports.addPolicy =
function addPolicy(model, policy) {
	// TODO

	// _validate(edge, schemas['policy']);
	console.warn('addPolicy() is not implemented yet'); // TODO
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
	console.warn('addProcess() is not implemented yet'); // TODO
	return add_(model, 'processes', process);
};


// ---
// ## `addRole`
let addRole = module.exports.addRole =
function addRole(model, role) {
	// TODO

	// _validate(edge, schemas['role']);
	console.warn('addRole() is not implemented yet'); // TODO
	return add_(model, 'roles', role);
};


// ---
// ## `addLocation`
let addLocation = module.exports.addLocation =
function addLocation(model, location) {
	location = _.extend(location || {}, {});
	// _validate(location, schemas['location']);
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


let separateAttributeFromObject = module.exports.separateAttributeFromObject =
function separateAttributeFromObject(attrNames, obj) {
	attrNames = attrNames || [];
	let attrObject = R.pick(attrNames, obj);
	let newObject = R.pick(R.without(attrNames, R.keys(obj)), obj);
	return { newObject, attrObject };
};


const knownAttributes = {
	'system': ['xmlns', 'xmlns:xsi', 'xsi:schemaLocation', 'author', 'version', 'date'],
	'location': ['id'],
	'actor': ['id'],
	'edge': ['directed', 'kind'],
	'item': ['id', 'name', 'type'],
	'data': ['id', 'name', 'value'],
	'credLocation': ['id'],
	'credData': ['name'],
	'credItem': ['name'],
	'credPredicate': ['name'],
	'process': ['id'],
	'in': ['loc'],
	'out': ['loc'],
	'predicate': ['id', 'arity'],
	'policy': ['id'],
	'metric': ['namespace', 'name', 'value'],
};


let toPrefixedObject = module.exports.toPrefixedObject =
function toPrefixedObject(prefix, it) {
	return { [prefix]: it };
};


let prepareForXml = module.exports.prepareForXml =
function prepareForXml(o, parentKey) {
	if (_.isArray(o)) {
		return o.map(function(item) {
			return prepareForXml(item, parentKey);
		});
	}
	else if (_.isString(o) || _.isNumber(o)) {
		return o;
	}
	else if (_.isObject(o)) {
		// handle attributes
		if (parentKey && knownAttributes[parentKey]) {
			const {newObject, attrObject} =
				separateAttributeFromObject(knownAttributes[parentKey], o);
			o = _.merge(newObject, { [attrKey]: attrObject });
		}

		return R.keys(o)
			.reduce(function(result, key) {
				if (key === attrKey) {
					result[key] = o[key];
					return result;
				}

				result[key] = prepareForXml(o[key], key);

				if (key === 'atLocations') {
					result[key] = result[key].join(' ');
				}

				return result;
			}, {});
	}
};


let prepareModelForXml = module.exports.prepareModelForXml =
function prepareModelForXml(model) {
	let system = model.system;

	const items = system.items || [];
	const data = system.data || [];
	delete system.items;
	delete system.data;

	R.keys(pluralToSingular)
		.forEach(function(collectionName) {
			if (system[collectionName]) {
				system[collectionName] = toPrefixedObject(
					singular(collectionName),
					system[collectionName]
				);

				// remove empty ones
				if (!system[collectionName][singular(collectionName)].length) {
					delete system[collectionName];
				}
			}
		});

	system.assets = {
		item: items,
		data: data,
	};
	if (!system.assets.item.length) {
		delete system.assets.item;
	}
	if (!system.assets.data.length) {
		delete system.assets.data;
	}
	if (R.keys(system.assets).length === 0) {
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

	var builder = new xml2js.Builder(xml2jsOptions);
	const xmlStr = builder.buildObject(model);

	// return xmlStr;
	return pd.xml(xmlStr)
		.replace(/' {2}'/ig, '\t'); // spaces to tabs
};
