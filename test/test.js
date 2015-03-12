var assert = require('assert');
var chalk = require('chalk');
var fs = require('fs');
var path = require('path');
var libxml = require('libxmljs');

var root_dir = path.join(__dirname, '..');


function higlight(s) {
	return chalk.bgBlue(s);
}


describe(higlight('validation'), function() {

	it('model should be a valid document', function() {
		var schema_content = fs.readFileSync(
			path.join(root_dir, 'data', 'TREsPASS_model.xsd')
		).toString();
		var schema = libxml.parseXmlString(schema_content);

		var model_content = fs.readFileSync(
			path.join(root_dir, 'data', 'model_cloud_review.xml')
		).toString();
		var model = libxml.parseXmlString(model_content);

		assert.equal(model.validate(schema), true);
	});

});
