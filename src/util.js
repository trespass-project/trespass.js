'use strict';

var cheerio = require('cheerio');
var _ = require('lodash');


const cheerioOpts =
module.exports.cheerioOpts = {
	xmlMode: true,
	normalizeWhitespace: false,
	lowerCaseTags: true,
	// lowerCaseAttributeNames: true
};


// ---
// ## `renameTag()`
// > renames selected tag to something else
var renameTag = module.exports.renameTag =
function renameTag(
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
// ## `unwrapRename()`
// > unwraps (remove parent) selected elements, and optinally rename
var unwrapRename = module.exports.unwrapRename =
function unwrapRename(
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
				renameTag($this, new_name);
			}

			var name = $this[0].name;
			if ($parent.children(name).length === 0) {
				$parent.remove();
			}
		});
}


// ---
// ## `getChildrenText()`
// > return children nodes' text value as `Array`
var getChildrenText = module.exports.getChildrenText =
function getChildrenText(
	$selection, /* selection */
	selector /* String (optional) */
) {
	var texts = [];
	$selection.children(selector || undefined)
		.each(function(index, elem) {
			var $this = $selection.find(this);
			texts.push($this.text().trim());
		});
	return texts;
}


// ---
// ## `childrenToObj()`
// > return children as `Object`
var childrenToObj = module.exports.childrenToObj =
function childrenToObj(
	$selection, /* selection */
	selector /* String (optional) */
) {
	var obj = {};
	$selection.children(selector || undefined)
		.each(function(index, elem) {
			var $this = $selection.find(this)
			obj[elem.name] = $this.text().trim();
		});
	return obj;
}
