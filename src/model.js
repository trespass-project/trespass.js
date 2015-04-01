var cheerio = require('cheerio');


// parse XML with [`cheerio`](https://www.npmjs.com/package/cheerio), so that we can query the
// model jquery-style.
module.exports.parse = function(xmlstring) {
	var $ = cheerio.load(xmlstring, { xmlMode: true });

	// returns the selected root node.
	return $('system');
};
