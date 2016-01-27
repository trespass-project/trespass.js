'use strict';

var assert = require('assert');
var R = require('ramda');
var _ = require('lodash');
var chalk = require('chalk');
var fs = require('fs');
var path = require('path');
var cheerio = require('cheerio');
var diff = require('deep-diff').diff;

// TODO: use `xmllint` instead
// http://stackoverflow.com/questions/4092812/tool-to-validate-an-xsd-on-ubuntu-linux
// var libxml = require('libxmljs');

var rootDir = path.join(__dirname, '..');
const testModelFilePath = path.join(rootDir, /*'test',*/ 'data', 'vsphere_export.xml');
const testModelXML = fs.readFileSync(testModelFilePath).toString();

const attrKey = '_attr';


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
		const separated = trespass.model.separateAttributeFromObject(attributes, obj);
		const newObject = separated.newObject;
		const attrObject = separated.attrObject;

		it(f3('should return 2 objects'), function() {
			assert(!!newObject && !!attrObject);
		});

		it(f3('should sort field correctly'), function() {
			assert(R.keys(newObject).length === 1);
			assert(R.keys(attrObject).length === 2);
			assert(R.equals(attributes, R.keys(attrObject)));
			assert(attrObject.attr2 === 'attr2');
			assert(newObject.test === 'test');
		});
	});

	describe(f2('.prepareModelForXml()'), function() {
		it(f3('should prefix all the elements of known root-level collections'), function() {
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

			assert(model.system.locations.location.length === 2);
			assert(model.system.actors.actor.length === 2);
			assert(model.system.unknowns.length === 2);

			model.system.locations.location
				.forEach(function(item) {
					const keys = R.keys(item);
					assert(keys.length === 1);
					assert(keys[0] === 'id');
				});
			model.system.actors.actor
				.forEach(function(item) {
					const keys = R.keys(item);
					assert(keys.length === 1);
					assert(keys[0] === 'id');
				});
			model.system.unknowns
				.forEach(function(item) {
					const keys = R.keys(item);
					assert(keys.length === 1);
					assert(keys[0] === 'id');
				});
		});

		it(f3('should join items and data in assets'), function() {
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

			assert(model.system.assets.item.length === 2);
			assert(model.system.assets.item[0].id === 'item-id-1');
			assert(model.system.assets.item[1].id === 'item-id-2');

			assert(model.system.assets.data.length === 2);
			assert(model.system.assets.data[0].id === 'data-id-1');
			assert(model.system.assets.data[1].id === 'data-id-2');
		});
	});

	describe(f2('.prepareForXml()'), function() {
		it(f3('should leave literals as they are'), function() {
			const data = {
				version: 0.1,
				author: 'author name',
			};
			const preparedData = trespass.model.prepareForXml(data);

			assert(preparedData.version === 0.1);
			assert(preparedData.author === 'author name');
		});

		// it(f3('should work with arbitrarily nested elements'), function() {
		// 	let data = {
		// 		one: {
		// 			two: {
		// 				three: 'value'
		// 			}
		// 		}
		// 	};
		// 	data = trespass.model.prepareForXml(data);
		// 	// console.log(JSON.stringify(data, null, '  '));
		// 	assert(data.length === 1);
		// 	assert(data[0]['one'].length === 1);
		// 	assert(data[0]['one'][0]['two'].length === 1);
		// 	assert(data[0]['one'][0]['two'][0]['three'] === 'value');
		// });

		it(f3('should join atLocations'), function() {
			const data = {
				atLocations: ['atLocation-1', 'atLocation-2']
			};
			const preparedData = trespass.model.prepareForXml(data);
			assert(preparedData.atLocations === 'atLocation-1 atLocation-2');
		});

		it(f3('should create attributes'), function() {
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

			assert(!!preparedData.system[attrKey]);
			assert(R.keys(preparedData.system[attrKey]).length === 2);
			assert(preparedData.system[attrKey].date === 'date');
			assert(preparedData.system[attrKey].author === 'author');
			assert(preparedData.system.title === 'title');
			assert(preparedData.system.locations.location[0][attrKey].id === 'location');
		});

		it(f3('should work'), function() {
			const model = {
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
			let preparedModel = trespass.model.prepareModelForXml(model);
			preparedModel = trespass.model.prepareForXml(preparedModel);

			assert(preparedModel.system.predicates.predicate.length === 1);
			assert(preparedModel.system.predicates.predicate[0].value.length === 3);
			assert(preparedModel.system.predicates.predicate[0][attrKey].arity === 2);
		});

		// TODO: what else?
	});

	describe(f2('.toXML()'), function() {
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
		console.log(xmlStr);
		const $system = cheerio.load(xmlStr, trespass.util.cheerioOpts)('system');

		it(f3('should properly transform model object to XML'), function() {
			assert( $system.find('locations > location').length === 2 );
			assert( $system.find('predicates > predicate').length === 1 );
			assert( $system.find('atLocations').length === 1 );
		});

		it(f3('should remove empty collections'), function() {
			assert( $system.find('actors').length === 0 );
			assert( $system.find('assets').length === 0 );
		});

		it(f3('should not make elements from array items'), function() {
			assert( xmlStr.indexOf('<0>') === -1 );
		});

		it(f3('should re-import model successfully'), function(done) {
			trespass.model.parse(xmlStr, function(err, model) {
				assert(model.system.locations.length === origModel.system.locations.length );
				assert(model.system.locations[1].id === 'location-2');
				assert(model.system.locations[1].atLocations.length === 2);
				assert(model.system.locations[1].atLocations[0] === 'loc-1');
				assert(model.system.locations[1].atLocations[1] === 'loc-2');

				assert(model.system.predicates.length === origModel.system.predicates.length);
				assert(model.system.predicates[0].value.length === 3);

				assert(model.system.actors.length === 0);
				// TODO: more

				done();
			});
		});

		it(f3('test file model should be equal to export-imported model'), function(done) {
			// import test file
			// export it as xml
			// import exported xml
			// then compare both imported models

			trespass.model.parse(testModelXML, function(err, model) {
				// console.log( JSON.stringify(model) );

				const xmlStr2 = trespass.model.toXML(model);
				// console.log(xmlStr2);
				// console.log(xmlStr2.indexOf('<0>'));
				// assert( xmlStr2.indexOf('<0>') === -1 );

				trespass.model.parse(xmlStr2, function(err, model2) {
					// console.log(xmlStr2);

					const differences = diff(model, model2);

					// console.log(differences);
					if (differences) {
						console.log(differences.length);
					}

					assert(!differences);

					done();
				});
			});
		});
	});

});
