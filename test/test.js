'use strict';

var assert = require('assert');
var R = require('ramda');
var _ = require('lodash');
var chalk = require('chalk');
var fs = require('fs');
var path = require('path');
var diff = require('deep-diff').diff;
// var xml = require('xml');

// TODO: use `xmllint` instead
// http://stackoverflow.com/questions/4092812/tool-to-validate-an-xsd-on-ubuntu-linux
// var libxml = require('libxmljs');

var rootDir = path.join(__dirname, '..');
const testModelFilePath = path.join(rootDir, /*'test',*/ 'data', 'vsphere_export.xml');

var trespass = require('../');

var f1 = function(s) {
	return chalk.magenta(s);
};
var f2 = function(s) {
	return chalk.bgMagenta.black(s);
};
var f3 = function(s) {
	return chalk.bgMagenta.white(s);
};


// describe(f1('validation'), function() {

// 	describe(f2('model'), function() {
// 		it(f3('should be a valid document'), function() {
// 			var schemaContent = fs.readFileSync(
// 				path.join(rootDir, 'data', 'TREsPASS_model.xsd')
// 			).toString();
// 			var schema = libxml.parseXmlString(schemaContent);

// 			var modelContent = fs.readFileSync(
// 				path.join(rootDir, 'data', 'model_cloud_review.xml')
// 			).toString();
// 			var model = libxml.parseXmlString(modelContent);

// 			assert.equal(model.validate(schema), true);
// 		});
// 	});

// });


// ---
describe(f1('trespass.model'), function() {
	var testModelXML = fs.readFileSync(testModelFilePath).toString();

	describe(f2('.parse()'), function() {
		trespass.model.parse(testModelXML, function(err, model) {
			it(f3('should import metadata'), function(done) {
				assert(model.system.author === 'ciab-exportAsTML.py');
				assert(model.system.version === '0.5');
				assert(model.system.date === '2016-01-17T23:20:21.866232');
				done();
			});

			it(f3('should import title'), function(done) {
				assert(model.system.title === 'CIAB-created TREsPASS XML model');
				done();
			});

			it(f3('should import rest of model'), function(done) {
				var predicates = model.system.predicates;
				assert(predicates.length === 3);
				assert(predicates[0].value.length === 90);

				var data = model.system.data;
				assert(data.length === 1);

				done();
			});

			it(f3('atLocations should always be an Array'), function(done) {
				var data = model.system.data;
				assert(_.isArray(data[0].atLocations));
				done();
			});
		});
	});

	describe(f2('.add*()'), function() {
		var model = trespass.model.create();
		var atLocation = 'atLocation';

		it(f3('should create rooms as locations'), function() {
			model = trespass.model.addRoom(model, { id: 'test-room' });
			assert( model.system.locations.length === 1 );
		});

		it(f3('should create rooms atLocations'), function() {
			model = trespass.model.addRoom(model, {
				id: 'test-room-2',
				atLocations: [atLocation]
			});
			assert( model.system.locations.length === 2 );
			assert( model.system.locations[1].atLocations[0] === atLocation );
		});

		it(f3('should create actors'), function() {
			model = trespass.model.addActor(model, {
				id: 'an-actor',
				atLocations: [atLocation]
			});
			assert( model.system.actors.length === 1 );
		});

		// TODO: more?

		// TODO: turn this on again
		// it(f3('should validate input'), function() {
		// 	assert.throws(function() {
		// 		model = trespass.model.addRoom(model, {
		// 			// missing `id`
		// 		});
		// 	});
		// 	assert.throws(function() {
		// 		model = trespass.model.addRoom(model, {
		// 			domain: '!@#$'
		// 		});
		// 	});
		// });
	});

	describe(f2('.singular()'), function() {
		it(f3('should return known singular'), function() {
			var s = trespass.model.singular('policies');
			assert(s === 'policy');
		});

		it(f3('should return `undefined`, if unknonw'), function() {
			var s = trespass.model.singular('hamburgers');
			assert(s === undefined);
		});
	});

	describe(f2('.separateAttributeFromObject()'), function() {
		const attributes = ['attr1', 'attr2'];
		const obj = {
			'attr1': 'attr1',
			'attr2': 'attr2',
			'test': 'test'
		};
		const attrKey = '_attr';
		const separated = trespass.model.separateAttributeFromObject(attributes, obj, attrKey);
		const newObject = separated.newObject;
		const attrObject = separated.attrObject;

		it(f3('should return 2 objects'), function() {
			assert(!!newObject && !!attrObject);
			assert(attrObject[attrKey] !== undefined);
		});

		it(f3('should sort field correctly'), function() {
			assert(R.keys(newObject).length === 1);
			assert(R.keys(attrObject[attrKey]).length === 2);
			assert(R.equals(attributes, R.keys(attrObject[attrKey])));
			assert(attrObject[attrKey].attr2 === 'attr2');
			assert(newObject.test === 'test');
		});
	});

	describe(f2('.objectToArrayOfPrefixedObjects()'), function() {
		it(f3('should work'), function() {
			const obj = {
				id: 'id-value',
				name: 'name-value'
			};
			const a = trespass.model.objectToArrayOfPrefixedObjects(obj);
			assert(a.length === 2);
			assert(
				a.filter(function(item) {
					return item.id === 'id-value';
				}).length === 1
			);
		});
	});

	describe(f2('.prepareModelForXml()'), function() {
		it(f3('should prefix all the elements of the root-level collections'), function() {
			let system = {
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
			let model = { system };
			model = trespass.model.prepareModelForXml(model);

			assert(model.system.locations.length === 2);
			assert(model.system.actors.length === 2);
			assert(model.system.unknowns.length === 2);

			model.system.locations
				.forEach(function(item) {
					const keys = R.keys(item);
					assert(keys.length === 1);
					assert(keys[0] === 'location');
				});
			model.system.actors
				.forEach(function(item) {
					const keys = R.keys(item);
					assert(keys.length === 1);
					assert(keys[0] === 'actor');
				});
			model.system.unknowns
				.forEach(function(item) {
					const keys = R.keys(item);
					assert(keys.length === 1);
					assert(keys[0] === 'id');
				});
		});
	});

	describe(f2('.prepareForXml()'), function() {
		it(f3('should leave literals as they are'), function() {
			let data = {
				version: 0.1,
				author: 'author name',
			};
			data = trespass.model.prepareForXml(data);
			assert(data[0].version === 0.1);
			assert(data[1].author === 'author name');
		});

		it(f3('should work with arbitrarily nested elements'), function() {
			let data = {
				one: {
					two: {
						three: 'value'
					}
				}
			};
			data = trespass.model.prepareForXml(data);
			// console.log(JSON.stringify(data, null, '  '));
			assert(data.length === 1);
			assert(data[0]['one'].length === 1);
			assert(data[0]['one'][0]['two'].length === 1);
			assert(data[0]['one'][0]['two'][0]['three'] === 'value');
		});

		it(f3('should join atLocations'), function() {
			let data = {
				atLocations: ['atLocation-1', 'atLocation-2']
			};
			data = trespass.model.prepareForXml(data);
			assert(data[0].atLocations === 'atLocation-1 atLocation-2');
		});

		it(f3('should work'), function() {
			let model = {
				system: {
					predicates: [
						{ arity: 2, id: 'isUserId', value: [
							'user1 userId1',
							'user2 userId2',
							'user3 userId3'
						]}
					]
				}
			};
			// console.log( trespass.model.toXML(model) );
			model = trespass.model.prepareModelForXml(model);
			model = trespass.model.prepareForXml(model);
			// console.log(model[0].system[1].predicates[0]);
			assert(
				model[0].system[1].predicates[0].predicate[1].value === 'user1 userId1' &&
				model[0].system[1].predicates[0].predicate[2].value === 'user2 userId2' &&
				model[0].system[1].predicates[0].predicate[3].value === 'user3 userId3'
			);
		});

		// TODO: what else?
	});

	describe(f2('.toXML()'), function() {
		it(f3('should properly transform model object to XML'), function(done) {
			const origModel = {
				system: {
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

			trespass.model.parse(xmlStr, function(err, model) {
				assert(model.system.locations.length === origModel.system.locations.length );
				assert(model.system.locations[1].id === 'location-2');
				assert(model.system.locations[1].atLocations.length === 2);
				assert(model.system.locations[1].atLocations[0] === 'loc-1');
				assert(model.system.locations[1].atLocations[1] === 'loc-2');

				assert(model.system.predicates.length === origModel.system.predicates.length);
				assert(model.system.predicates[0].value.length === 3);

				// TODO: more

				done();
			});

		});

		// it(f3('test file model should be equal to export-imported model'), function() {
		// 	// import test file
		// 	// export it as xml
		// 	// import exported xml
		// 	// then compare both imported models

		// 	const xmlStr = fs.readFileSync(testModelFilePath).toString();
		// 	const $system = trespass.model.parse(xmlStr)('system');
		// 	const model = trespass.model.prepare($system);

		// 	const xmlStr2 = trespass.model.toXML(model);
		// 	const $system2 = trespass.model.parse(xmlStr2)('system');
		// 	const model2 = trespass.model.prepare($system2);
		// 	// console.log(xmlStr2);

		// 	const differences = diff(model, model2);
		// 	// TODO: do s.th. with this
		// 	// assert(!differences);
		// });
	});

});
