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
module.exports.toArrayIfNotAlready =
function toArrayIfNotAlready(list) {
	return (_.isArray(list))
		? list
		: [list];
};


const toHashMap =
module.exports.toHashMap =
function toHashMap(key='id', list) {
	return list
		.reduce((acc, item) => {
			acc[item[key]] = item;
			return acc;
		}, {});
};


const prepareParameter =
module.exports.prepareParameter =
function prepareParameter(param) {
	return {
		name: param[attrKey].name,
		class: param[attrKey].class,
		value: stringToNumber(param[charKey]),
	};
};


// const parseXml =
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

			let treeRoot = parsedTree[rootElemName];
			treeRoot = prepareTree(treeRoot);
			treeRoot = prepareAnnotatedTree(treeRoot);

			return resolve(treeRoot);
		});
	});
};


const prepareTree =
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


// const toXml =
module.exports.toXml =
function toXml(rootNode, opts=xml2jsOptions) {
	const builder = new xml2js.Builder(opts);
	const xmlStr = builder.buildObject({
		[rootElemName]: { node: rootNode }
	});
	return Promise.resolve(xmlStr);
};


// const findLeafNodes =
module.exports.findLeafNodes =
function findLeafNodes(nodes, childrenKey=childElemName) {
	const leafNodes = [];

	function recurse(item) {
		const isLeaf = !item[childrenKey];
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


// const getAllPaths =
module.exports.getAllPaths =
function getAllPaths(tree, childrenKey=childElemName) {
	// returns a list of all the paths in a tree.
	// does not take conjunctive-ness into account.

	function recurse(tree, currentPath, allPaths) {
		tree.forEach((node) => {
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
	recurse(tree, [], allPaths);
	return allPaths;
};
