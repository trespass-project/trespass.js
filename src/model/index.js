'use strict';

const _ = require('lodash');
const R = require('ramda');
const Joi = require('joi');
const async = require('async');
const moment = require('moment');
const xml2js = require('xml2js');
const pd = require('pretty-data').pd;


const attrKey = '_attr';
const charKey = '_text';
const xml2jsOptions = {
	attrkey: attrKey,
	charkey: charKey,
	trim: true,
	explicitArray: /*true*/ false,
};


const singularPluralCollection = [
	{
		singular: 'actor',
		plural: 'actors',
		collection: 'actors',
	},
	{
		singular: 'edge',
		plural: 'edges',
		collection: 'edges',
	},
	{
		singular: 'location',
		plural: 'locations',
		collection: 'locations',
	},
	{
		singular: 'policy',
		plural: 'policies',
		collection: 'policies',
	},
	{
		singular: 'predicate',
		plural: 'predicates',
		collection: 'predicates',
	},
	{
		singular: 'process',
		plural: 'processes',
		collection: 'processes',
	},
	{
		singular: 'item',
		plural: 'assets',
		collection: 'items',
	},
	{
		singular: 'data',
		plural: 'assets',
		collection: 'data',
	},
];

// collectionNameSingular['processes'] = 'process'
const collectionNameSingular = module.exports.collectionNameSingular =
singularPluralCollection
	.reduce((result, item) => {
		result[item.plural] = item.singular;
		return result;
	}, {});

const collectionNames = module.exports.collectionNames =
R.keys(collectionNameSingular);


// ---
// ## `emptyModel`
// > model default structure
const emptyModel = module.exports.emptyModel =
singularPluralCollection
	.map(R.prop('collection'))
	.reduce((result, collectionName) => {
			result.system[collectionName] = [];
			return result;
		},
		{
			system: {
				xmlns: 'https://www.trespass-project.eu/schemas/TREsPASS_model',
				'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
				'xsi:schemaLocation': 'https://www.trespass-project.eu/schemas/TREsPASS_model.xsd',
				author: 'trespass.js',
				version: '0.0.0',
				title: 'Untitled',
				id: undefined,
				anm_data: undefined,
				date: undefined, // will be set on export
			}
		}
	);


// ---
// ## `create`
// > return a new, empty model object
const create = module.exports.create =
function create() {
	return _.merge({}, emptyModel);
};


// ---
// ## `emptyModel`
// > model default structure
const emptyScenario = module.exports.emptyScenario = {
	scenario: {
		xmlns: 'https://www.trespass-project.eu/schemas/TREsPASS_model',
		'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
		'xsi:schemaLocation': 'https://www.trespass-project.eu/schemas/TREsPASS_model.xsd',
		author: 'trespass.js',
		version: '0.0.0',
		id: 'Untitled',
		date: undefined,

		model: undefined,

		assetGoal: {
			attacker: undefined,
			asset: undefined,
		},

		// TODO: implement

		// locationGoal: {
		// 	attacker: undefined,
		// },

		// actionGoal: {
		// 	attacker: undefined,
		// 	credentials: [],
		// 	enabled: undefined
		// },
	},
};


// ---
// ## `createScenario`
// > return a new, empty model object
const createScenario = module.exports.createScenario =
function createScenario() {
	return _.merge({}, emptyScenario);
};

const scenarioSetModel = module.exports.scenarioSetModel =
function scenarioSetModel(scenario, modelFileName) {
	return _.merge(
		{},
		scenario,
		{ scenario: { model: modelFileName } }
	);
};

const scenarioSetAssetGoal = module.exports.scenarioSetAssetGoal =
function scenarioSetAssetGoal(scenario, attackerId, assetId) {
	return _.merge(
		{},
		scenario,
		{
			scenario: {
				assetGoal: {
					attacker: attackerId,
					asset: assetId,
				},
			},
		}
	);
};

const scenarioToXML = module.exports.scenarioToXML =
function scenarioToXML(scenario) {
	scenario.scenario.date = scenario.scenario.date || moment().format('YYYY-MM-DD HH:mm:ss');
	const prepared = prepareForXml(scenario);
	const builder = new xml2js.Builder(xml2jsOptions);
	const xmlStr = builder.buildObject(prepared);
	return xmlStr;
};


// ---
// ## `singular`
const singular = module.exports.singular =
function singular(plural) {
	return collectionNameSingular[plural];
};


// ---
// ## `parse()`
// > parse XML with [`cheerio`](https://www.npmjs.com/package/cheerio), so that we can query the model 'jquery-style'.
const parse = module.exports.parse =
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
				.map((arrItem) => {
					return recurse(arrItem);
				});
		} else if (_.isString(item)) {
			item = item
				.replace(/[\r\n\t]/ig, ' ')
				.replace(/ +/ig, ' ');

			if (key === 'atLocations') {
				item = item.split(' ');
			}

			return item;
		} else if (_.isNumber(item)) {
			return item;
		} else if (_.isObject(item)) {
			item = mergeAttributes(item);
			R.keys(item)
				.forEach((key) => {
					item[key] = recurse(item[key], key);
				});

			return item;
		}
	}

	let model = create();
	let parsed;

	async.series(
		[
			(cb) => { // parse
				xml2js.parseString(xmlStr, xml2jsOptions, (err, _parsed) => {
					if (err) {
						return cb(err);
					}

					parsed = _parsed;
					cb(null);
				});
			},

			(cb) => { // metadata
				const metadata = parsed.system[attrKey];
				model.system = _.merge(model.system, metadata);
				cb(null);
			},

			(cb) => { // title
				model.system = _.merge(model.system, { title: parsed.system.title });
				cb(null, model);
			},

			(cb) => { // all the rest
				singularPluralCollection.forEach((item) => {
					let coll = parsed.system[item.plural];
					if (coll) {
						if (!_.isArray(coll[item.singular])) {
							coll[item.singular] =[coll[item.singular]];
						}

						// filter, because for some reason
						// `coll[item.singular]` is [undefined] in some cases
						// TODO: find out why
						coll[item.singular] = coll[item.singular]
							.filter((item) => {
								return !!item;
							});

						model.system[item.collection] = recurse(coll[item.singular]);
					}
				});

				if (model.system.anm_data) {
					model.system.anm_data = JSON.parse(model.system.anm_data);
				}

				cb(null, model);
			},
		],

		(err) => {
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
	id: Joi.string().required(),
	atLocations: Joi.array().items(Joi.string()),
});
schemas.edge = Joi.object().keys({
	source: Joi.string().required(),
	target: Joi.string().required(),
	kind: Joi.string(),
	directed: Joi.boolean(),
});
schemas.item = Joi.object().keys({
	id: Joi.string().required(),
	name: Joi.string().required(),
	type: Joi.string(),
	atLocations: Joi.array().items(Joi.string()).required(),
});
schemas.data = Joi.object().keys({
	id: Joi.string().required(),
	name: Joi.string().required(),
	value: Joi.string().required(),
	atLocations: Joi.array().items(Joi.string()).required(),
});
schemas.actor = Joi.object().keys({
	id: Joi.string().required(),
	atLocations: Joi.array().items(Joi.string()).required(),
});
schemas.policy = Joi.object().keys({
	id: Joi.string().required(),
	enabled: Joi.object().required(), // TODO: refine
	credentials: Joi.object().required(), // TODO: refine
	atLocations: Joi.array().items(Joi.string()).required(),
});
schemas.process = Joi.object().keys({
	id: Joi.string().required(),
	actions: Joi.object().required(), // TODO: refine
	atLocations: Joi.array().items(Joi.string()).required(),
});
schemas.predicate = Joi.object().keys({
	id: Joi.string().required(),
	arity: Joi.string().required(),
	value: Joi.array().items(Joi.string()).required(),
});
schemas.metric = Joi.object().keys({
	name: Joi.string().required(),
	value: Joi.string().required(),
	namespace: Joi.string(),
});

const validationOptions = {
	allowUnknown: true,
};

function validate(it, schemaName) {
	const result = Joi.validate(it, schemas[schemaName], validationOptions);
	if (result.error) {
		console.warn(schemaName, '→', result.error);
	}
}


// ---
// ## `add_`
const add_ = module.exports.add_ =
function add_(model, dest, item) {
	if (!model.system[dest]) {
		model.system[dest] = [];
	}

	model.system[dest].push(item);
	return model;
};


// ---
// ## `addActor`
const addActor = module.exports.addActor =
function addActor(model, actor) {
	// actor = _.extend(actor || {}, {});
	// validate(actor, 'actor');
	return add_(model, 'actors', actor);
};


// ---
// ## `addItem`
const addItem = module.exports.addItem =
function addItem(model, item) {
	// item = _.extend(item || {}, {});
	if (!item.name) {
		item.name = item.id;
	}

	// validate(item, 'item');
	return add_(model, 'items', item);
};


// ---
// ## `addData`
const addData = module.exports.addData =
function addData(model, data) {
	// data = _.extend(data || {}, {});
	if (!data.name) {
		data.name = data.id;
	}

	// validate(data, 'data');
	return add_(model, 'data', data);
};


// ---
// ## `addEdge`
const addEdge = module.exports.addEdge =
function addEdge(model, edge) {
	edge = _.defaults(edge || {}, {
		directed: true,
	});

	// edge = _.extend(edge || {}, {});
	// validate(edge, 'edge');
	return add_(model, 'edges', edge);
};


// ---
// ## `addPolicy`
const addPolicy = module.exports.addPolicy =
function addPolicy(model, policy) {
	// validate(policy, 'policy');
	// console.warn('addPolicy() is not implemented yet');
	return add_(model, 'policies', policy);
};


// ---
// ## `addPredicate`
const addPredicate = module.exports.addPredicate =
function addPredicate(model, predicate) {
	// validate(predicate, 'predicate');
	return add_(model, 'predicates', predicate);
};


// ---
// ## `addProcess`
const addProcess = module.exports.addProcess =
function addProcess(model, process) {
	// validate(process, 'process');
	// console.warn('addProcess() is not implemented yet');
	return add_(model, 'processes', process);
};


// ---
// ## `addLocation`
const addLocation = module.exports.addLocation =
function addLocation(model, location) {
	// location = _.extend(location || {}, {});
	// validate(location, 'location');
	return add_(model, 'locations', location);
};


// ---
// ## `addRoom`
const addRoom = module.exports.addRoom =
function addRoom(model, room) {
	// room = _.extend(room || {}, {
	// 	// domain: 'physical'
	// });
	return addLocation(model, room);
};


const separateAttributeFromObject = module.exports.separateAttributeFromObject =
function separateAttributeFromObject(attrNames, obj) {
	attrNames = attrNames || [];
	let attrObject = R.pick(attrNames, obj);
	let newObject = R.pick(R.without(attrNames, R.keys(obj)), obj);
	return { newObject, attrObject };
};


const knownAttributes = {
	// scenario
	scenario: ['xmlns', 'xmlns:xsi', 'xsi:schemaLocation', 'author', 'version', 'date', 'id'],
	assetGoal: ['attacker'],
	// TODO: more

	// model
	system: ['xmlns', 'xmlns:xsi', 'xsi:schemaLocation', 'author', 'version', 'date', 'id', 'anm_data'],
	location: ['id'],
	actor: ['id'],
	edge: ['directed', 'kind'],
	item: ['id', 'name', 'type'],
	data: ['id', 'name', 'value'],
	credLocation: ['id'],
	credData: ['name'],
	credItem: ['name'],
	credPredicate: ['name'],
	process: ['id'],
	in: ['loc'],
	out: ['loc'],
	predicate: ['id', 'arity'],
	policy: ['id'],
	metric: ['namespace', 'name', 'value'],
};


const toPrefixedObject = module.exports.toPrefixedObject =
function toPrefixedObject(prefix, it) {
	return { [prefix]: it };
};


const prepareForXml = module.exports.prepareForXml =
function prepareForXml(o, parentKey) {
	if (_.isArray(o)) {
		return o.map((item) => {
			return prepareForXml(item, parentKey);
		});
	} else if (_.isString(o) || _.isNumber(o)) {
		return o;
	} else if (_.isObject(o)) {
		// handle attributes
		if (parentKey && knownAttributes[parentKey]) {
			const { newObject, attrObject } =
				separateAttributeFromObject(knownAttributes[parentKey], o);
			o = _.merge(newObject, { [attrKey]: attrObject });
		}

		return R.keys(o)
			.reduce((result, key) => {
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


const prepareModelForXml = module.exports.prepareModelForXml =
function prepareModelForXml(model) {
	let system = model.system;

	const items = system.items || [];
	const data = system.data || [];
	delete system.items;
	delete system.data;

	collectionNames
		.forEach((collectionName) => {
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
const toXML = module.exports.toXML =
function toXML(
	_model /* Object */
) {
	// duplicate model
	let model = _.merge({}, _model);

	if (!model.system.id) {
		throw new Error('model.system needs an id');
	}

	// set fill in the gaps with defaults
	model.system = _.defaults(model.system, {
		date: moment().format('YYYY-MM-DD HH:mm:ss'),
	});

	model = prepareModelForXml(model);
	model = prepareForXml(model);

	var builder = new xml2js.Builder(xml2jsOptions);
	const xmlStr = builder.buildObject(model);

	// return xmlStr;
	return pd.xml(xmlStr)
		.replace(/' {2}'/ig, '\t'); // spaces to tabs
};
