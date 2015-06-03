var cheerio = $ = require('cheerio'); $ = undefined;
var _ = require('lodash');


module.exports.cheerio_opts =
cheerio_opts = {
	xmlMode: true,
	normalizeWhitespace: false,
	lowerCaseTags: true,
	// lowerCaseAttributeNames: true
};


// ---
// ## `rename_tag()`
// > renames selected tag to something else
var rename_tag =
module.exports.rename_tag =
function(
	$elem, /* selection */
	new_name /* String */
) {
	var html = $elem.html();
	var attrs = $elem.attr();
	var $new_elem = cheerio('<'+new_name+'>');
	$new_elem.attr(attrs);
	$new_elem.html(html);
	$elem.replaceWith($new_elem);
	return $new_elem;
}


// ---
// ## `unwrap_rename()`
// > unwraps (remove parent) selected elements, and optinally rename
var unwrap_rename =
module.exports.unwrap_rename =
function(
	$selection, /* selection */
	new_name /* String */
) {
	$selection
		.each(function(index, elem) {
			var $this = cheerio(this);
			var $parent = $this.parent();
			var $parentparent = $parent.parent();
			$parentparent.append($this);

			if (_.isString(new_name)) {
				rename_tag($this, new_name);
			}

			var name = $this[0].name;
			if ($parent.children(name).length === 0) {
				$parent.remove();
			}
		});
}


// ---
// ## `get_children_text()`
// > return children nodes' text value as `Array`
var get_children_text =
module.exports.get_children_text =
function(
	$selection, /* selection */
	selector /* String (optional) */
) {
	var texts = [];
	$selection.children(selector || undefined)
		.each(function(index, elem) {
			var $this = $selection.find(this);
			texts.push($this.text());
		});
	return texts;
}


// ---
// ## `children_to_obj()`
// > return children as `Object`
var children_to_obj =
module.exports.children_to_obj =
function(
	$selection, /* selection */
	selector /* String (optional) */
) {
	var obj = {};
	$selection.children(selector || undefined)
		.each(function(index, elem) {
			var $this = $selection.find(this)
			obj[elem.name] = $this.text();
		});
	return obj;
}
