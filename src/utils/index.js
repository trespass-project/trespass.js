/**
 * Utility functions
 * @module trespass/utils
 */

const _ = require('lodash');
const R = require('ramda');


const toPrefixedObject =
/**
 * puts `it` into an object, with property `prefix`.
 *
 * @param {String} prefix - property name
 * @param {} it - anything
 * @returns {Object}
 */
module.exports.toPrefixedObject =
function toPrefixedObject(prefix, it) {
	return { [prefix]: it };
};


const stringToNumber =
/**
 * converts a string to a number, if possible. otherwise returns original string.
 *
 * @param {String} str
 * @returns {Number|String}
 */
module.exports.stringToNumber =
function stringToNumber(str) {
	const trimmed = `${str}`.trim();

	const intPattern = /^\d+$/ig;
	const floatPattern = /^\d*\.\d+$/ig;
	if (!intPattern.test(trimmed) && !floatPattern.test(trimmed)) {
		return str;
	}

	const parsed = parseFloat(trimmed, 10);
	return (!_.isNaN(parsed))
		? parsed
		: str;
};


const ensureArray =
/**
 * converts the parameter to an array, if it isn't one already.
 *
 * @param {} list - possibly a list
 * @returns {Array}
 */
module.exports.ensureArray =
function ensureArray(list) {
	return (_.isArray(list))
		? list
		: [list];
};


const toHashMap =
/**
 * turns an array into an object, with `key` as property name.
 *
 * @param {String} key - property name to use as key
 * @param {Array} list - the list to transform
 * @returns {Object}
 */
module.exports.toHashMap =
function toHashMap(key='id', list) {
	return list
		.reduce((acc, item) => {
			acc[item[key]] = item;
			return acc;
		}, {});
};


const renameHashMapKeys =
/**
 * renames keys in an object
 *
 * @param {Object} keyRenameMap - map from old to new key name
 * @param {Object} obj - the hashmap
 * @returns {Object}
 */
module.exports.renameHashMapKeys =
function renameHashMapKeys(keyRenameMap, obj) {
	const oldKeys = R.keys(keyRenameMap);
	return oldKeys
		.reduce((acc, oldKey) => {
			const newKey = keyRenameMap[oldKey];
			acc[newKey] = obj[oldKey];
			return acc;
		}, R.omit(oldKeys, obj));
};
