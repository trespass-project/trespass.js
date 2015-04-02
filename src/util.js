var cheerio = $ = require('cheerio');


module.exports.cheerio_opts =
cheerio_opts = {
	xmlMode: true,
	normalizeWhitespace: false,
	lowerCaseTags: true,
	// lowerCaseAttributeNames: true
};


// ---
// return children nodes' text value as `Array`
module.exports.get_children_text =
get_children_text = function(
	$selection, /* selection */
	selector /* String (optional) */
) {
	var texts = [];
	$selection.children(selector || undefined)
		.each(function(index, elem) {
			texts.push($(this).text());
		});
	return texts;
}


// ---
// return children as `Object`
module.exports.children_to_obj =
children_to_obj = function(
	$selection, /* selection */
	selector /* String (optional) */
) {
	var obj = {};
	$selection.children(selector || undefined)
		.each(function(index, elem) {
			obj[elem.name] = $(this).text();
		});
	return obj;
}
