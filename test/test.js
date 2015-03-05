var assert = require('assert');
var chalk = require('chalk');


function f(s) {
	return chalk.bgBlue(s);
}


describe('a', function() {

	describe(f('#b()'), function() {
		it("should c", function() {
			assert(true);
		});
	});

});
