/**
 * Functions to process attack trees.
 * @module trespass/attacktree
 */

const R = require('ramda');
const _ = require('lodash');
const xml2js = require('xml2js');

const attrKey = module.exports.attrKey = '_attr';
const charKey = module.exports.charKey = '_text';
const xml2jsOptions = {
	attrkey: attrKey,
	charkey: charKey,
	trim: true,
	explicitArray: false, // we'll take care of `node` elems ourselves
};
const rootElemName = module.exports.rootElemName = 'adtree';
const childElemName = module.exports.childElemName = 'node';
const parameterElemName = module.exports.parameterElemName = 'parameter';


const stringToNumber =
/**
 * converts a string to a number, if possible. otherwise returns original string.
 * @param {String} str
 * @returns {Number|String}
 */
module.exports.stringToNumber =
function stringToNumber(str) {
	const trimmed = str.trim();

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


const toArrayIfNotAlready =
/**
 * converts the parameter to an array, if it isn't one already.
 * @param {} list - possibly a list
 * @returns {Array}
 */
module.exports.toArrayIfNotAlready =
function toArrayIfNotAlready(list) {
	return (_.isArray(list))
		? list
		: [list];
};


const toHashMap =
/**
 * turns an array into an object, with `key` as property name.
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


const prepareParameter =
/**
 * transforms the shape of an annotation parameter to s.th. more useful
 * @param {Object} param - annotation parameter
 * @returns {Object}
 */
module.exports.prepareParameter =
function prepareParameter(param) {
	return {
		name: param[attrKey].name,
		class: param[attrKey].class,
		value: stringToNumber(param[charKey]),
	};
};


const parseXml =
/**
 * parses an attack tree xml string
 * @param {String} xmlStr - attack tree xml string
 * @returns {Promise} resolves to attack tree object
 */
module.exports.parseXml =
function parseXml(xmlStr, opts=xml2jsOptions) {
	return new Promise((resolve, reject) => {
		xml2js.parseString(xmlStr, opts, (err, parsedTree) => {
			if (err) {
				console.error(err);
				return reject(err);
			}
			if (!parsedTree[rootElemName]) {
				const message = 'failed to parse attack tree xml';
				console.error(message);
				return reject(new Error(message));
			}

			let attacktree = parsedTree[rootElemName];
			attacktree = prepareTree(attacktree);
			attacktree = prepareAnnotatedTree(attacktree);

			return resolve(attacktree);
		});
	});
};


const getRootNode =
/**
 * returns the rood node of an attack tree
 * @param {Object} attacktree - attack tree object
 * @returns {Object} root node
 */
module.exports.getRootNode =
function getRootNode(attacktree, childrenKey=childElemName) {
	return attacktree[childrenKey][0];
};


const prepareTree =
/**
 * prepares an attack tree object.
 * - conversion from strings to numbers
 * - ensure all children are arrays
 * @param {Object} rootNode - root node of an attack tree
 * @returns {Object} root node
 */
module.exports.prepareTree =
function prepareTree(rootNode, childrenKey=childElemName) {
	function recurse(item) {
		// convert numeric attributes from strings to real numbers
		R.keys(item[attrKey])
			.forEach((key) => {
				item[attrKey][key] = stringToNumber(item[attrKey][key]);
			});

		// make sure children are array
		if (item[childrenKey]) {
			item[childrenKey] = toArrayIfNotAlready(item[childrenKey]);
		}

		const children = item[childrenKey];
		if (!!children) {
			children.forEach(node => recurse(node));
		}
	}

	[rootNode].forEach(node => recurse(node));
	return rootNode;
};


const prepareAnnotatedTree =
/**
 * prepares an annotated attack tree object.
 * @param {Object} rootNode - root node of an attack tree
 * @returns {Object} root node
 */
module.exports.prepareAnnotatedTree =
function prepareAnnotatedTree(rootNode, childrenKey=childElemName) {
	function recurse(item) {
		if (item[parameterElemName]) {
			item[parameterElemName] = toHashMap(
				'name',
				item[parameterElemName].map(prepareParameter)
			);
		}

		const children = item[childrenKey];
		if (!!children) {
			children.forEach(node => recurse(node));
		}
	}

	[rootNode].forEach(node => recurse(node));
	return rootNode;
};


// TODO: test with annotated tree
const toXml =
/**
 * renders an attack tree as xml string.
 * @param {Object} rootNode - root node of an attack tree
 * @returns {String} attack tree xml string
 */
module.exports.toXml =
function toXml(rootNode, opts=xml2jsOptions) {
	const builder = new xml2js.Builder(opts);
	const xmlStr = builder.buildObject({
		[rootElemName]: { node: rootNode }
	});
	return Promise.resolve(xmlStr);
};


// TODO: take rootNode as first param?
const findLeafNodes =
/**
 * given a list of nodes, returns all leaf nodes.
 * @param {Array} nodes - list of nodes
 * @returns {Array} list of leaf nodes
 */
module.exports.findLeafNodes =
function findLeafNodes(nodes, childrenKey=childElemName) {
	const leafNodes = [];

	function recurse(item) {
		const isLeaf = _.isEmpty(item[childrenKey]);
		if (isLeaf) {
			leafNodes.push(item);
		} else {
			// TODO: make sure this is always an array, already when parsing
			const children = item[childrenKey];
			children.forEach(node => recurse(node));
		}
	}

	nodes.forEach(node => recurse(node));
	return leafNodes;
};


const getAllPaths =
/**
 * given a list of nodes, returns a list of all the paths in a tree,
 * ending in leaf nodes. — does not take conjunctive-ness into account.
 * @param {Array} nodes - list of nodes
 * @returns {Array} list of paths (path: array of nodes)
 */
module.exports.getAllPaths =
function getAllPaths(nodes, childrenKey=childElemName) {
	function recurse(nodes, currentPath, allPaths) {
		nodes.forEach((node) => {
			const children = node[childrenKey];
			const newCurrentPath = [...currentPath, node];
			if (children && children.length > 0) {
				recurse(
					(!_.isArray(children))
						? [children]
						: children,
					newCurrentPath,
					allPaths
				);
			} else {
				allPaths.push(newCurrentPath);
			}
		});
	}

	const allPaths = [];
	recurse(nodes, [], allPaths);
	return allPaths;
};
