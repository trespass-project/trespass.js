/**
 * Functions to process attack trees.
 * @module trespass/attacktree
 */


/** [trespass/attacktree/adtool]{@link module:trespass/attacktree/adtool} */
const adtool = module.exports.adtool = require('./adtool.js');
/** [trespass/attacktree/apl]{@link module:trespass/attacktree/apl} */
const apl = module.exports.apl = require('./apl.js');


// TODO: define `attacktree`, `tree`, `rootNode`

const R = require('ramda');
const _ = require('lodash');
const xml2js = require('xml2js');
const utils = require('../utils');


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
const parentKey = module.exports.parentKey = 'parent';

const annotatedFlavors =
module.exports.annotatedFlavors = [
	'ata',
	'apl',
	'adtool',
];


const prepareParameter =
/**
 * transforms the shape of an annotation parameter to s.th. more useful
 *
 * @param {Object} param - annotation parameter
 * @param {String} flavor - attack tree flavor name
 * @returns {Object} transformed parameter
 */
module.exports.prepareParameter =
function prepareParameter(param, flavor) {
	if (flavor === 'adtool') {
		param = adtool.prepareParameter(param, { attrKey, charKey });
	}
	return {
		name: param[attrKey].name,
		class: param[attrKey].class,
		value: utils.stringToNumber(param[charKey]),
	};
};

const unprepareParameter =
/**
 * reverse [prepareParameter]{@link module:trespass/attacktree.prepareParameter}
 *
 * @param {Object} param
 * @returns {Object}
 */
module.exports.unprepareParameter =
function unprepareParameter(param) {
	return {
		[attrKey]: {
			name: param.name,
			class: param.class,
		},
		[charKey]: `${param.value}`,
	};
};


const detectFlavor =
/**
 * detects the flavor of the attacktree:
 * - `treemaker`
 * - `adtool`
 * - `apl`
 * - `ata`
 *
 * @param {Object} tree - attack tree
 * @returns {String} name of flavor
 */
module.exports.detectFlavor =
function detectFlavor(tree) {
	function checkTreemaker(tree) {
		return !!tree[attrKey]
			&& !!tree[attrKey].profit
			/*&& !!tree[attrKey].id*/;
	}

	function checkATA(tree) {
		return !!tree[attrKey]
			&& !!tree[attrKey].utility;
	}

	function checkADtool(tree) {
		return !!tree.domain;
	}

	function treeHasLeafParameters(tree) {
		function hasParams(node) {
			return !!node[parameterElemName];
		}
		const leafNodes = findLeafNodes([getRootNode(tree)]);
		return R.any(hasParams)(leafNodes);
	}

	const result = {
		adtool: false,
		ata: false,
		apl: false,
		treemaker: false,
	};

	result.adtool = checkADtool(tree);
	if (!result.adtool) {
		result.ata = checkATA(tree);
	}
	if (!result.ata) {
		result.apl = checkTreemaker(tree) && treeHasLeafParameters(tree);
	}
	if (!result.apl) {
		result.treemaker = checkTreemaker(tree);
	}

	return R.keys(result)
		.reduce((acc, key) => {
			return (result[key])
				? key
				: acc;
		}, 'vanilla');
};


const parse =
/**
 * parses an attack tree xml string
 *
 * @param {String} xmlStr - attack tree xml string
 * @returns {Promise} resolves to attack tree object
 */
module.exports.parse =
function parse(xmlStr, opts=xml2jsOptions) {
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

			const flavor = detectFlavor(attacktree) || 'vanilla';
			if (R.contains(flavor, annotatedFlavors)) {
				attacktree = prepareAnnotatedTree(attacktree, flavor);
			}
			attacktree.flavor = flavor;

			return resolve(attacktree);
		});
	});
};


const getRootNode =
/**
 * returns the rood node of an attack tree
 *
 * @param {Object} attacktree - attack tree object
 * @returns {Object} root node
 */
module.exports.getRootNode =
function getRootNode(attacktree) {
	return attacktree[childElemName][0];
};


const isConjunctive =
module.exports.isConjunctive =
function isConjunctive(node) {
	return node[attrKey]
		&& node[attrKey].refinement === 'conjunctive';
}


const prepareTree =
/**
 * prepares an attack tree object.
 * - conversion from strings to numbers
 * - ensure all children are arrays
 *
 * @param {Object} rootNode - root node of an attack tree
 * @returns {Object} root node
 */
module.exports.prepareTree =
function prepareTree(attacktree) {
	function recurse(item, depth=0) {
		item.depth = depth;

		// convert numeric attributes from strings to real numbers
		R.keys(item[attrKey])
			.forEach((key) => {
				item[attrKey][key] = utils.stringToNumber(item[attrKey][key]);
			});

		// make sure children are an array
		if (item[childElemName]) {
			item[childElemName] = utils.ensureArray(item[childElemName]);
		}

		const children = item[childElemName];
		if (!!children) {
			children.forEach((node) => {
				// set parent
				node[parentKey] = (depth > 0)
					? item
					: null;

				// if it already exists, remove it
				delete node.conjunctiveSiblingLeft;
				delete node.conjunctiveSiblingRight;
			});

			// set left / right conjunctive sibling
			if (isConjunctive(item)) {
				R.tail(children)
					.forEach((node, i) => {
						node.conjunctiveSiblingLeft = children[i];
					});
				R.init(children)
					.forEach((node, i) => {
						node.conjunctiveSiblingRight = children[i + 1];
					});
			}

			children.forEach(node => recurse(node, depth + 1));
		}
	}

	attacktree[attrKey] = attacktree[attrKey] || {};

	[attacktree].forEach(node => recurse(node));
	return attacktree;
};


const prepareAnnotatedTree =
/**
 * prepares an annotated attack tree object.
 *
 * @param {Object} rootNode - root node of an attack tree
 * @param {String} flavor - attack tree flavor name
 * @returns {Object} root node
 */
module.exports.prepareAnnotatedTree =
function prepareAnnotatedTree(attacktree, flavor) {
	function recurse(item) {
		if (item[parameterElemName]) {
			item[parameterElemName] = utils.ensureArray(item[parameterElemName]);
			item[parameterElemName] = utils.toHashMap(
				'name',
				item[parameterElemName].map(prepareParameter, flavor)
			);
		}

		const children = item[childElemName];
		if (!!children) {
			children.forEach(node => recurse(node));
		}
	}

	[attacktree].forEach(node => recurse(node));
	return attacktree;
};


// TODO: test with annotated tree
const toXml =
/**
 * renders an attack tree object as xml string.
 *
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


const getAllNodes =
/**
 * returns a list of all nodes in tree
 *
 * @param {Object} rootNode - tree root
 * @returns {Array} list of nodes
 */
module.exports.getAllNodes =
function getAllNodes(rootNode) {
	let result = [];

	function recurse(node) {
		result = [...result, node];
		const children = node[childElemName] || [];
		children.forEach(child => recurse(child));
	}

	recurse(rootNode);
	return result;
};


const findLeafNodes =
/**
 * given a list of nodes, returns all leaf nodes.
 *
 * @param {Object|Array} nodes - node or list of nodes
 * @returns {Array} list of leaf nodes
 */
module.exports.findLeafNodes =
function findLeafNodes(_nodes) {
	const nodes = utils.ensureArray(_nodes);
	const leafNodes = [];

	function recurse(item) {
		const isLeaf = _.isEmpty(item[childElemName]);
		if (isLeaf) {
			leafNodes.push(item);
		} else {
			const children = item[childElemName];
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
 *
 * @param {Array} nodes - list of nodes
 * @returns {Array} list of paths (path: array of nodes)
 */
module.exports.getAllPaths =
function getAllPaths(nodes) {
	function recurse(nodes, currentPath, allPaths) {
		nodes.forEach((node) => {
			const children = node[childElemName];
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


const findNodes =
/**
 * find nodes in tree by property value.
 *
 * @param {Object} rootNode - tree root
 * @param {String} key - name of property
 * @param {} value - the value to find
 * @returns {Array} list of nodes
 */
module.exports.findNodes =
function findNodes(rootNode, key, value) {
	let results = [];

	function recurse(nodes) {
		nodes.forEach((node) => {
			if (node[key] === value) {
				results = [...results, node];
			} else {
				recurse(node[childElemName] || []);
			}
		});
	}

	recurse([rootNode]);
	return results;
};


const pathToRoot =
/**
 * finds the path from given node to the root node.
 *
 * @param {Object} node - tree node
 * @returns {Array} path (= list of nodes)
 */
module.exports.pathToRoot =
function pathToRoot(node) {
	let p = [];
	let current = node;
	while (true) {
		p = [current, ...p];
		const parent = current[parentKey];
		if (!parent) {
			break;
		} else {
			current = parent;
		}
	}
	return p;
};


const treeFromPaths =
/**
 * constructs a tree from multiple paths (= lists of nodes).
 *
 * @param {Array} paths - list of paths
 * @returns {Object} root node of tree
 */
module.exports.treeFromPaths =
function treeFromPaths(paths) {
	if (paths.length === 0) {
		throw new Error('empty list');
	}

	function duplicateNode(node) {
		const omittedKeys = [
			childElemName,
			parentKey,
			'depth',
		];
		return _.merge(
			{},
			R.omit(omittedKeys, node),
			{ [childElemName]: [] }
		);
	}

	function compactList(list) {
		return list.filter((sublist) => (sublist.length > 0));
	}

	function withoutFirstElements(list) {
		return list.map(R.tail);
	}

	function recurse(parentNode, paths) {
		if (!paths || !paths.length) {
			return;
		}

		const grouped = R.groupBy(
			R.pipe(
				R.head,
				(headNode) => {
					const suffix = (isConjunctive(headNode))
						? 'conjunctive'
						: 'disjunctive';
					return `${headNode.label}_${suffix}`;
				}
			),
			paths
		);
		R.values(grouped)
			.forEach((paths) => {
				// all paths share the same head
				const node = duplicateNode(paths[0][0]);
				parentNode.node = [...parentNode.node, node];

				// cut off head
				// compacting removes empty items
				const newPaths = compactList(
					withoutFirstElements(paths)
				);
				recurse(node, newPaths);
			});
	}

	const rootNode = duplicateNode(paths[0][0]);
	const pathsTails = withoutFirstElements(paths);
	recurse(rootNode, pathsTails);

	return rootNode;
};


const subtreeFromLeafLabels =
/**
 * given a tree and a list of labels, returns a new tree,
 * which is a subset of the original tree, whose leaf nodes
 * are the ones with the corresponding labels.
 *
 * @param {Object} rootNode - tree root
 * @returns {Object} root node of subtree
 */
module.exports.subtreeFromLeafLabels =
function subtreeFromLeafLabels(_rootNode, leafLabels) {
	const rootNode = _.merge({}, _rootNode);

	// const allLabels = getAllNodes(rootNode)
	// 	.map(R.prop('label'));
	// const histogramMap = R.countBy(R.identity, allLabels);
	// it's true: there are duplicate nodes
	// console.log(histogramMap);

	// labels to nodes
	let nodes = leafLabels
		.reduce((acc, label) => {
			const nodes = findNodes(rootNode, 'label', label);
			if (!nodes.length) {
				console.error(`"${label}" does not exist in reference tree`);
			}
			return [...acc, ...nodes];
		}, []);

	nodes = nodes
		.filter((node) => {
			// eliminate ones that are not leaf nodes
			if (node[childElemName] && node[childElemName].length) {
				return false;
			}

			// eliminate nodes with missing conjunctive siblings
			if (isConjunctive(node.parent)) {
				const isInLabelsList = (node) => {
					return R.contains(node.label, leafLabels);
				};
				const allSiblingsInLeafLabelsList = R.all(
					isInLabelsList,
					node.parent[childElemName]
				);
				if (!allSiblingsInLeafLabelsList) {
					// this is definitely not the right one,
					// so it can be removed
					return false;
				}
			}
			return true;
		});

	// nodes to paths
	const paths = nodes.map(pathToRoot);
	// tree from paths
	let subtree = treeFromPaths(paths);

	// add `parent` field again,
	// and conjunctive siblings
	subtree = prepareTree(subtree);

	// function fixSiblings(node) {
	// 	console.log(node.parent);
	// 	if (node.conjunctiveSiblingRight) {
	// 		const siblingLabel = node.conjunctiveSiblingRight.label;
	// 		const sibling = findNode(
	// 			cleanSubtree,
	// 			'label',
	// 			siblingLabel
	// 		);
	// 		if (!sibling) {
	// 			console.log(`'${node.label}' is missing right-hand sibling '${siblingLabel}'`);
	// 			delete node.conjunctiveSiblingRight;
	// 		} else {
	// 			node.conjunctiveSiblingRight = sibling;
	// 		}
	// 	}
	// 	if (node.conjunctiveSiblingLeft) {
	// 		const siblingLabel = node.conjunctiveSiblingLeft.label;
	// 		const sibling = findNode(
	// 			cleanSubtree,
	// 			'label',
	// 			siblingLabel
	// 		);
	// 		if (!sibling) {
	// 			console.log(`'${node.label}' is missing left-hand sibling '${siblingLabel}'`);
	// 			delete node.conjunctiveSiblingLeft;
	// 		} else {
	// 			node.conjunctiveSiblingLeft = sibling;
	// 		}
	// 	}

	// 	(node[childElemName] || []).forEach(fixSiblings);
	// }
	// const cleanSubtree = _.merge({}, subtree);
	// fixSiblings(cleanSubtree);

	// return cleanSubtree;
	return subtree;
};


const actions = [
	'in',
	'out',
	'move',
	'exec',
	'goto',
	'make',
	'force',

	'get', // ? not according to leafGrammer.txt
	'and',
	'attacker',
];
const parseLabel =
/**
 * parses a tree label and returns structured information
 *
 * @param {String} _labelStr - label
 * @returns {Object} parsed information
 */
module.exports.parseLabel =
function parseLabel(_labelStr) {
	const labelStr = _labelStr
		.trim()
		.replace(/ +/ig, ' ');
	const parts = labelStr.split(/ /ig);

	const isAction = (item) => R.contains(item.toLowerCase(), actions);
	const isNotAction = R.complement(isAction);

	let result = [];
	let remaining = parts;
	let action = undefined;
	while (remaining.length) {
		const collected = R.takeWhile(isNotAction, remaining);
		if (!collected.length) {
			action = R.head(remaining).toLowerCase();
			remaining = R.tail(remaining);
		}

		remaining = R.slice(collected.length, Infinity, remaining);

		if (collected.length || action === 'and') {
			result = [
				...result,
				{ action, ids: collected }
			];
		}
	}

	return result;
};


const getIdsFromLabel =
/**
 * takes a tree node label string and returns a list of ids
 *
 * @param {String} labelStr - label
 * @returns {Array} list of ids
 */
module.exports.getIdsFromLabel = R.compose(
	R.flatten,
	R.map(R.prop('ids')),
	parseLabel
);
