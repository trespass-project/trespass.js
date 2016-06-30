const _ = require('lodash');
const xml2js = require('xml2js');

const attrKey = '_attr';
const charKey = '_text';
const xml2jsOptions = {
	attrkey: attrKey,
	charkey: charKey,
	trim: true,
	explicitArray: /*true*/ false,
};

const rootElemName = 'adtree';
const childElemName = 'node';


// const parseXml =
module.exports.parseXml =
function parseXml(xmlStr, opts=xml2jsOptions) {
	return new Promise((resolve, reject) => {
		xml2js.parseString(xmlStr, opts, (err, parsedTree) => {
			if (err) {
				console.error('failed to parse attack tree xml');
				return reject(err);
			}
			return resolve(parsedTree[rootElemName]);
		});
	});
};


const getRootNode =
module.exports.getRootNode =
function getRootNode(tree, childrenKey=childElemName) {
	return tree[childrenKey];
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
			item[childrenKey].forEach(node => recurse(node));
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
