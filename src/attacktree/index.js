const R = require('ramda');
const _ = require('lodash');
const xml2js = require('xml2js');

const attrKey = '_attr';
const charKey = '_text';
const xml2jsOptions = {
	attrkey: attrKey,
	charkey: charKey,
	trim: true,
	explicitArray: true,
};

const rootElemName = 'adtree';
const childElemName = 'node';


const stringToNumber =
module.exports.stringToNumber =
function stringToNumber(str) {
	const trimmed = str.trim();

	const digitsOnly = /^\d+$/ig;
	if (!digitsOnly.test(trimmed)) {
		return str;
	}

	const parsed = parseFloat(trimmed, 10);
	return (!_.isNaN(parsed))
		? parsed
		: str;
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

			return resolve(treeRoot);
		});
	});
};


const prepareTree =
module.exports.prepareTree =
function prepareTree(rootNode, childrenKey=childElemName) {
	function recurse(item) {
		R.keys(item[attrKey])
			.forEach((key) => {
				item[attrKey][key] = stringToNumber(item[attrKey][key]);
			});

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
