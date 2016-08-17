import { test } from 'ava-spec';
const R = require('ramda');
const _ = require('lodash');
const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');
const diff = require('deep-diff').diff;
const common = require('./common.js');
const trespass = require('../');

const rootDir = path.join(__dirname, '..');
const testModelFilePath = path.join(rootDir, 'test', 'data', 'vsphere_export.xml');
const testModelXML = fs.readFileSync(testModelFilePath).toString();


// const validateXML = require('xmllint').validateXML;
// const xsdFilePath = path.join(__dirname, '../data/TREsPASS_model.xsd');
// const schemaStr = fs.readFileSync(xsdFilePath).toString();
// function validateXmlWithSchema(schemaStr, modelStr) {
// 	const result = validateXML({
// 		xml: modelStr,
// 		schema: schemaStr,
// 	});
// 	return result.errors || true;
// }


// test.group('validation', (test) => {

// 	test.group('model', (test) => {
// 		test('should be a valid document', (t) => {
// 			const schemaContent = fs.readFileSync(
// 				path.join(rootDir, 'data', 'TREsPASS_model.xsd')
// 			).toString();
// 			const schema = libxml.parseXmlString(schemaContent);

// 			const modelContent = fs.readFileSync(
// 				path.join(rootDir, 'data', 'model_cloud_review.xml')
// 			).toString();
// 			const model = libxml.parseXmlString(modelContent);

// 			assert.equal(model.validate(schema), true);
// 		});
// 	});

// });


// ---
// test.group('trespass.model', (test) => {
// test.group('test file', (test) => {
// 	test('should be valid', (t) => {
// 		const isValid = validateXmlWithSchema(schemaStr, testModelXML);
// 		t.true(isValid);
// 	});
// });

test.group('.parse()', (test) => {
	test('should dynamically create empty collections', (t) => {
		const newModel = trespass.model.create();
		t.true(!!trespass.model.collectionNames);
		trespass.model.collectionNames
			.forEach((name) => {
				t.true(newModel.system[name].length === 0);
			});
	});

	trespass.model.parse(testModelXML, (err, model) => {
		test.cb('should import metadata', (t) => {
			t.true(model.system.author === 'ciab-exportAsTML.py');
			t.true(model.system.version === '0.5');
			t.true(!!model.system.date);
			t.end();
		});

		test.cb('should import title', (t) => {
			t.true(model.system.title === 'CIAB-created TREsPASS XML model');
			t.end();
		});

		test.cb('should import rest of model', (t) => {
			const predicates = model.system.predicates;
			t.true(predicates.length === 3);
			t.true(predicates[0].value.length === 26);
			t.true(predicates[0].value[0].length === 2);

			const data = model.system.data;
			t.true(data.length === 1);
			t.end();
		});

		test.cb('atLocations should always be an Array', (t) => {
			const data = model.system.data;
			t.true(_.isArray(data[0].atLocations));
			t.end();
		});

		test.cb('predicate value should always be an Array', (t) => {
			const predicates = model.system.predicates;
			t.true(_.isArray(predicates[0].value[0]));
			t.end();
		});
	});

	let modelXML = fs.readFileSync(
		path.join(rootDir, 'test', 'data', 'test.xml')
	).toString();
	trespass.model.parse(modelXML, (err, model) => {
		test.cb('should not produce any weird [undefined]s', (t) => {
			t.true(model.system.items.length === 0);
			t.end();
		});
	});

	modelXML = fs.readFileSync(
		path.join(rootDir, 'test', 'data', 'anm-data.xml')
	).toString();
	trespass.model.parse(modelXML, (err, model) => {
		test.cb('should import and parse ANM data', (t) => {
			// console.log(model.system.anm_data.system);
			t.true(!!model.system.anm_data.system);
			t.true(model.system.anm_data.system.title === 'embedded');
			t.true(model.system.anm_data.system.locations.length === 2);
			t.end();
		});
	});
});

test.group('.add*()', (test) => {
	let model = trespass.model.create();
	const atLocation = 'atLocation';

	test('should create locations', (t) => {
		model = trespass.model.addLocation(model, {
			id: 'test-room'
		});
		t.true(model.system.locations.length === 1);
	});

	test('should create rooms atLocations', (t) => {
		model = trespass.model.addLocation(model, {
			id: 'test-room-2',
			atLocations: [atLocation]
		});
		t.true(model.system.locations.length === 2);
		t.true(model.system.locations[1].atLocations[0] === atLocation);
	});

	test('should create actors', (t) => {
		model = trespass.model.addActor(model, {
			id: 'an-actor',
			atLocations: [atLocation]
		});
		t.true(model.system.actors.length === 1);
		t.true(model.system.actors[0].atLocations[0] === atLocation);
	});

	// TODO: more?
});

test.group('.addPredicate()', (test) => {
	let model = trespass.model.create();
	const relationType = 'contracted-by';
	const basePred = {
		id: relationType,
		arity: 2,
	};
	const pred1 = _.extend({}, basePred, { value: ['node-1 node-2'] });
	const pred2 = _.extend({}, basePred, { value: ['node-2 node-3'] });
	model = trespass.model.addPredicate(model, pred1);
	model = trespass.model.addPredicate(model, pred2);
	const predicates = model.system.predicates;

	test('should use existing predicate', (t) => {
		t.true(predicates.length === 1); // not 2
		t.true(predicates[0].value.length === 2);
	});

	test('should split up values', (t) => {
		t.true(predicates[0].value[0].length === 2);
		t.true(predicates[0].value[1].length === 2);
	});
});

test.group('predicates', (test) => {
	test.cb('should re-import model successfully', (t) => {
		/* eslint indent:0 */
		const xmlStr = [
			'<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
			'<system xmlns="https://www.trespass-project.eu/schemas/TREsPASS_model" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="https://www.trespass-project.eu/schemas/TREsPASS_model.xsd" author="trespass.js" version="0.0.0" date="2016-02-08 16:29:30">',
				'<title>Untitled</title>',
				'<predicates>',
					'<predicate arity="2" id="isUserIdAt">',
						'<value>a b</value>',
					'</predicate>',
					'<predicate arity="2" id="isContractedBy">',
						'<value>c d</value>',
						'<value>e d</value>',
					'</predicate>',
				'</predicates>',
			'</system>',
		].join('\n');

		trespass.model.parse(xmlStr, (err, model) => {
			// console.log(model.system.predicates);
			t.true(model.system.predicates.length === 2);
			t.true(_.isArray(model.system.predicates[0].value));
			t.true(_.isArray(model.system.predicates[1].value));
			t.end();
		});
	});
});

test.group('.singular()', (test) => {
	test('should return known singular', (t) => {
		const s = trespass.model.singular('policies');
		t.true(s === 'policy');
	});

	test('should return `undefined`, if unknonw', (t) => {
		const s = trespass.model.singular('hamburgers');
		t.true(s === undefined);
	});
});

test.group('.separateAttributeFromObject()', (test) => {
	const attributes = ['attr1', 'attr2'];
	const obj = {
		'attr1': 'attr1',
		'attr2': 'attr2',
		'test': 'test'
	};
	const separated = trespass.model.separateAttributeFromObject(attributes, obj);
	const newObject = separated.newObject;
	const attrObject = separated.attrObject;

	test('should return 2 objects', (t) => {
		t.true(!!newObject && !!attrObject);
	});

	test('should sort field correctly', (t) => {
		t.true(R.keys(newObject).length === 1);
		t.true(R.keys(attrObject).length === 2);
		t.true(R.equals(attributes, R.keys(attrObject)));
		t.true(attrObject.attr2 === 'attr2');
		t.true(newObject.test === 'test');
	});
});

test.group('.prepareModelForXml()', (test) => {
	test('should prefix all the elements of known root-level collections', (t) => {
		const system = {
			locations: [
				{ id: 'location-id-1' },
				{ id: 'location-id-2' },
			],
			actors: [
				{ id: 'actor-id-1' },
				{ id: 'actor-id-2' },
			],
			unknowns: [
				{ id: 'unknown-id-1' },
				{ id: 'unknown-id-2' },
			]
		};
		const model = trespass.model.prepareModelForXml({ system });

		t.true(model.system.locations.location.length === 2);
		t.true(model.system.actors.actor.length === 2);
		t.true(model.system.unknowns.length === 2);

		model.system.locations.location
			.forEach((item) => {
				const keys = R.keys(item);
				t.true(keys.length === 1);
				t.true(keys[0] === 'id');
			});
		model.system.actors.actor
			.forEach((item) => {
				const keys = R.keys(item);
				t.true(keys.length === 1);
				t.true(keys[0] === 'id');
			});
		model.system.unknowns
			.forEach((item) => {
				const keys = R.keys(item);
				t.true(keys.length === 1);
				t.true(keys[0] === 'id');
			});
	});

	test('should join items and data in assets', (t) => {
		const system = {
			items: [
				{ id: 'item-id-1' },
				{ id: 'item-id-2' },
			],
			data: [
				{ id: 'data-id-1' },
				{ id: 'data-id-2' },
			]
		};
		const model = trespass.model.prepareModelForXml({ system });

		t.true(model.system.assets.item.length === 2);
		t.true(model.system.assets.item[0].id === 'item-id-1');
		t.true(model.system.assets.item[1].id === 'item-id-2');

		t.true(model.system.assets.data.length === 2);
		t.true(model.system.assets.data[0].id === 'data-id-1');
		t.true(model.system.assets.data[1].id === 'data-id-2');
	});
});

test.group('.prepareForXml()', (test) => {
	test('should leave literals as they are', (t) => {
		const data = {
			version: 0.1,
			author: 'author name',
		};
		const preparedData = trespass.model.prepareForXml(data);

		t.true(preparedData.version === 0.1);
		t.true(preparedData.author === 'author name');
	});

	// test('should work with arbitrarily nested elements', (t) => {
	// 	let data = {
	// 		one: {
	// 			two: {
	// 				three: 'value'
	// 			}
	// 		}
	// 	};
	// 	data = trespass.model.prepareForXml(data);
	// 	// console.log(JSON.stringify(data, null, '  '));
	// 	t.true(data.length === 1);
	// 	t.true(data[0]['one'].length === 1);
	// 	t.true(data[0]['one'][0]['two'].length === 1);
	// 	t.true(data[0]['one'][0]['two'][0]['three'] === 'value');
	// });

	test('should join atLocations', (t) => {
		const data = {
			atLocations: ['atLocation-1', 'atLocation-2']
		};
		const preparedData = trespass.model.prepareForXml(data);
		t.true(preparedData.atLocations === 'atLocation-1 atLocation-2');
	});

	test('should create attributes', (t) => {
		const data = {
			system: {
				date: 'date',
				title: 'title',
				author: 'author',
				locations: {
					location: [
						{ id: 'location' }
					]
				}
			}
		};
		const preparedData = trespass.model.prepareForXml(data);
		const system = preparedData.system;
		const attributes = preparedData.system[common.attrKey];
		t.true(!!attributes);
		t.true(R.keys(attributes).length === 2);
		t.true(attributes.date === 'date');
		t.true(attributes.author === 'author');
		t.true(system.title === 'title');
		t.true(system.locations.location[0][common.attrKey].id === 'location');
	});

	test('should work', (t) => {
		const model = {
			system: {
				predicates: [
					{
						arity: 2,
						id: 'isUserId',
						value: [
							'user1 userId1',
							'user2 userId2',
							'user3 userId3'
						]
					}
				]
			}
		};
		let preparedModel = trespass.model.prepareModelForXml(model);
		preparedModel = trespass.model.prepareForXml(preparedModel);

		const predicates = preparedModel.system.predicates;
		t.true(predicates.predicate.length === 1);
		t.true(predicates.predicate[0].value.length === 3);
		t.true(predicates.predicate[0][common.attrKey].arity === 2);
	});

	// TODO: what else?
});

test.group('.toXML()', (test) => {
	const origModel = {
		system: {
			id: 'model-id',
			title: 'title',
			locations: [
				{ id: 'location-1' },
				{ id: 'location-2', atLocations: ['loc-1', 'loc-2'] },
			],
			predicates: [
				{ arity: 2, id: 'isPasswordOf', value: [
					'pred1 user1',
					'pred2 user2',
					'pred3 user3'
				]}
			]
		}
	};
	const xmlStr = trespass.model.toXML(origModel);
	const $system = cheerio.load(xmlStr, common.cheerioOptions)('system');

	test('should properly transform model object to XML', (t) => {
		t.true($system.find('locations > location').length === 2);
		t.true($system.find('predicates > predicate').length === 1);
		t.true($system.find('atLocations').length === 1);
	});

	test('should remove empty collections', (t) => {
		t.true($system.find('actors').length === 0);
		t.true($system.find('assets').length === 0);
	});

	test('should not make elements from array items', (t) => {
		t.true(xmlStr.indexOf('<0>') === -1);
	});

	test('should require a system id', (t) => {
		const origModel = {
			system: {
				id: undefined,
				title: 'title',
			}
		};
		t.throws(() => {
			trespass.model.toXML(origModel);
		});
	});

	// test('output xml should be valid', (t) => {
	// 	const isValid = validateXmlWithSchema(schemaStr, xmlStr);
	// 	t.true(isValid);
	// });

	test.cb('should re-import model successfully', (t) => {
		trespass.model.parse(xmlStr, (err, model) => {
			t.true(model.system.locations.length === origModel.system.locations.length);
			t.true(model.system.locations[1].id === 'location-2');
			t.true(model.system.locations[1].atLocations.length === 2);
			t.true(model.system.locations[1].atLocations[0] === 'loc-1');
			t.true(model.system.locations[1].atLocations[1] === 'loc-2');

			t.true(model.system.predicates.length === origModel.system.predicates.length);
			t.true(model.system.predicates[0].value.length === 3);

			t.true(model.system.actors.length === 0);
			// TODO: more

			t.end();
		});
	});

	test.cb('test file model should be equal to export-imported model', (t) => {
		// import test file
		// export it as xml
		// import exported xml
		// then compare both imported models

		trespass.model.parse(testModelXML, (err, model) => {
			// console.log( JSON.stringify(model) );

			const xmlStr2 = trespass.model.toXML(model);
			// console.log(xmlStr2);
			// console.log(xmlStr2.indexOf('<0>'));
			// t.true(xmlStr2.indexOf('<0>') === -1);

			trespass.model.parse(xmlStr2, (err, model2) => {
				// console.log(xmlStr2);

				const differences = diff(model, model2);

				// console.log(differences);
				if (differences) {
					console.log(differences.length);
				}

				t.true(!differences);
				t.end();
			});
		});
	});
});

// ——————————————————————————————————————

test.group('.validateComponent()', (test) => {
	test('should work', (t) => {
		let obj = { type: 'type', };
		let result = trespass.model.validateComponent(obj, 'location');
		t.true(result.length === 1);

		obj = { type: 123, };
		result = trespass.model.validateComponent(obj, 'location');
		t.true(result.length === 2);
	});

	test('should work with arrays of things', (t) => {
		let obj = {
			id: 'actor',
			atLocations: [],
		};
		let result = trespass.model.validateComponent(obj, 'actor');
		t.true(result.length > 0);

		obj = {
			id: 'actor',
			atLocations: [1, 2, 3],
		};
		result = trespass.model.validateComponent(obj, 'actor');
		t.true(result.length > 0);
	});

	test('should return a custom message for atLocations', (t) => {
		const obj = {
			id: 'actor',
			// atLocations: [],
		};
		const result = trespass.model.validateComponent(obj, 'actor');
		t.true(result[0].message === 'actor must be located somewhere');
	});
});
