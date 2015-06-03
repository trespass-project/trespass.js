var assert = require('assert');
var chalk = require('chalk');
var fs = require('fs');
var path = require('path');
// var libxml = require('libxmljs');

var root_dir = path.join(__dirname, '..');

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
// 			var schema_content = fs.readFileSync(
// 				path.join(root_dir, 'data', 'TREsPASS_model.xsd')
// 			).toString();
// 			var schema = libxml.parseXmlString(schema_content);

// 			var model_content = fs.readFileSync(
// 				path.join(root_dir, 'data', 'model_cloud_review.xml')
// 			).toString();
// 			var model = libxml.parseXmlString(model_content);

// 			assert.equal(model.validate(schema), true);
// 		});
// 	});

// });


// ---
describe(f1('trespass.model'), function() {

	describe(f2('.children_to_obj()'), function() {
		it(f3('should be able to handle mixed case and hyphenated tag names'), function() {
			var $xml = trespass.model.parse(
				'<edge>'+
					'<SOURCE>source</SOURCE>'+
					'<tarGet>tarGet</tarGet>'+
					'<un-related>un-related</un-related>'+
				'</edge>',
				'edge'
			);
			var result = trespass.util.children_to_obj($xml);
			assert(result['source']);
			assert(result['target']);
			assert(result['un-related']);
		});
	});

})

// ---
describe(f1('trespass.model'), function() {

	var model_xml = fs.readFileSync(
			path.join(root_dir, 'test', 'data', 'model_cloud_review.xml')
		).toString();

	describe(f2('.parse()'), function() {
		it(f3('should work with and without initial selector'), function() {
			assert(
				trespass.model.parse(model_xml, 'system').find('location').length
				===
				trespass.model.parse(model_xml)('system').find('location').length
			);
		});

		it(f3('should load correctly'), function() {
			var $system = trespass.model.parse(model_xml, 'system');
			assert($system.attr().author === 'Christian W Probst');
			assert($system.find('locations > location').length === 22);
		});
	});

	describe(f2('.prepare()'), function() {
		it(f3('should properly transform xml selection to js object'), function() {
			var $system = trespass.model.parse(model_xml, 'system');
			var model = trespass.model.prepare($system);
			assert(model.system.locations.length === 22);
			assert(model.system.locations[15].atLocations.length > 0);
			assert(model.system.assets.filter(function(item) { return item.type == 'data' }).length == 12);
		});
	});

	describe(f2('.xmlify()'), function() {
		it(f3('should properly transform object back to XML'), function() {
			var $system = trespass.model.parse(model_xml, 'system');
			var model = trespass.model.prepare($system);
			var xml_str = trespass.model.xmlify(model);

			var $system = trespass.model.parse(xml_str, 'system');
			assert( $system.find('locations > location').length == 22 );
			assert( $system.find('edge > source').length == 26 );
			assert( $system.find('assets > item > atLocations').length == 7 );
			assert( $system.find('predicates > predicate').eq(1).find('value').length == 4 );
		});
	});

	describe(f2('.create()'), function() {
		it(f3('should create a new model object'), function() {
			var model = trespass.model.create();
			assert(model.system.locations.length === 0);

			var $system, xml_str;

			model = trespass.model.addRoom(model, { id: 'test-room' });
			xml_str = trespass.model.xmlify(model);
			$system = trespass.model.parse(xml_str, 'system');
			assert( $system.find('locations > location').length === 1 );

			model = trespass.model.addRoom(model, {
				id: 'test-room-2',
				atLocations: ['at location']
			});
			xml_str = trespass.model.xmlify(model);
			$system = trespass.model.parse(xml_str, 'system');
			assert( $system.find('locations > location').length === 2 );
			assert( $system.find('#test-room-2').text().trim() === 'at location' );
			assert( $system.find('#test-room-2 > atLocations').children().length === 0 );

			// var path = 'system.date'.split('.');
			// assert(model.getIn(path) != undefined);
		});
	});

});
