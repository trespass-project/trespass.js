const findLeafNodes =
module.exports.findLeafNodes =
function findLeafNodes(nodes, childrenKey='node') {
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
