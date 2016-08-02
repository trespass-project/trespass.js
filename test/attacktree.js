import { test } from 'ava-spec';
const fs = require('fs');
const path = require('path');
const _ = require('lodash');
const R = require('ramda');
const trespass = require('../');

const rootDir = path.join(__dirname, '..');
const testDataPath = path.join(rootDir, 'test', 'data');


const ataParameters = [
	{
		_attr: { 'class': 'numeric', 'name': 'cost' },
		_text: '1000',
	},
	{
		_attr: { 'class': 'ordinal', 'name': 'likelihood' },
		_text: '0.5', // TODO: how is this ordinal?!
	},
	{
		_attr: { 'class': 'ordinal', 'name': 'difficulty' },
		_text: 'M',
	},
	{
		_attr: { 'class': 'ordinal', 'name': 'time' },
		_text: 'D',
	},
];


const adtoolParameters = [
	{
		_attr: { 'domainId': 'cost', 'category': 'basic' },
		_text: '1000',
	},
];


test.group('parse()', (test) => {
	/* eslint indent: 0 */
	const xmlStr = [
		'<?xml version="1.0" encoding="UTF-8"?>',
		'<adtree profit="5000" id="tree-id">',
			'<node refinement="disjunctive">',
				'<label>root node</label>',

				'<node refinement="disjunctive">',
					'<label>child node 1</label>',

					'<node refinement="disjunctive">',
						'<label>child node 1-1</label>',
					'</node>',
				'</node>',

				'<node refinement="disjunctive">',
					'<label>child node 2</label>',
				'</node>',

			'</node>',
		'</adtree>',
	].join('\n');

	return trespass.attacktree.parse(xmlStr/*, opts*/)
		.then((tree) => {
			test('should work', (t) => {
				t.true(tree._attr.id === 'tree-id');
			});

			test('child nodes should be arrays – even with only one child', (t) => {
				t.true(_.isArray(tree.node)); // root node
				t.true(_.isArray(tree.node[0].node));
				t.true(_.isArray(tree.node[0].node[0].node)); // 1
				t.true(!tree.node[0].node[1].node); // 2
			});

			test('labels should NOT be arrays', (t) => {
				t.true(!_.isArray(tree.node.label));
			});
		});
});


test.group('prepareTree()', (test) => {
	test('should convert strings to numbers', (t) => {
		const attacktree = {
			_attr: { profit: '5000' },
			node: [
				{
					_attr: { profit: '6000' },
				}
			]
		};
		const prepared = trespass.attacktree.prepareTree(attacktree);

		t.true(prepared._attr.profit === 5000);
		t.true(prepared.node[0]._attr.profit === 6000);
	});

	test('should add reference to node parent', (t) => {
		const attacktree = {
			node: [
				{
					label: 'root',
					node: [
						{
							label: 'child-1',
							node: [
								{ label: 'grand-child-1' }
							],
						},
						{
							label: 'child-2',
							node: [],
						},
					],
				}
			]
		};
		const prepared = trespass.attacktree.prepareTree(attacktree);

		const root = prepared.node[0];
		const child1 = root.node[0];
		const grandchild1 = child1.node[0];
		const child2 = root.node[1];
		t.true(grandchild1.parent.label === 'child-1');
		t.true(child1.parent.label === 'root');
		t.true(child2.parent.label === 'root');
		t.true(!root.parent);
		t.true(!prepared.parent);
	});

	test('should set left and right conjunctive sibling', (t) => {
		const attacktree = {
			node: [
				{
					_attr: { refinement: 'conjunctive' },
					label: 'conjunctive-node',
					node: [
						{ label: 'sibling-0' },
						{ label: 'sibling-1' },
						{ label: 'sibling-2' },
					],
				}
			]
		};
		const prepared = trespass.attacktree.prepareTree(attacktree);
		const siblings = prepared.node[0].node;
		t.true(siblings[0].conjunctiveSiblingRight.label === siblings[1].label);
		t.true(siblings[1].conjunctiveSiblingLeft.label === siblings[0].label);
		t.true(siblings[1].conjunctiveSiblingRight.label === siblings[2].label);
		t.true(siblings[2].conjunctiveSiblingLeft.label === siblings[1].label);
	});
});


test.group('prepareParameter()', (test) => {
	test('should work with ata-style parameters', (t) => {
		const param = ataParameters[0];
		const flavor = 'ata';
		const prepared = trespass.attacktree.prepareParameter(param, flavor);
		t.true(prepared.name === 'cost');
		t.true(prepared.class === 'numeric');
		t.true(prepared.value === 1000);
	});

	test('should work with adtool-style parameters', (t) => {
		const param = adtoolParameters[0];
		const flavor = 'adtool';
		const prepared = trespass.attacktree.prepareParameter(param, flavor);
		t.true(prepared.name === 'cost');
		t.true(prepared.class === undefined);
		t.true(prepared.value === 1000);
	});
});


test.group('unprepareParameter()', (test) => {
	test('should work', (t) => {
		const param = {
			name: 'cost',
			class: 'numeric',
			value: 1000,
		};
		const unprepared = trespass.attacktree.unprepareParameter(param);
		t.true(unprepared['_attr'].name === 'cost');
		t.true(unprepared['_attr'].class === 'numeric');
		t.true(unprepared['_text'] === '1000');
	});
});


test.group('prepareAnnotatedTree()', (test) => {
	const attacktree = {
		node: [
			{
				node: [
					{
						parameter: undefined,
					}
				]
			},
			{
				parameter: ataParameters,
				node: [
					{
						parameter: ataParameters,
					},
				]
			},
		]
	};
	const flavor = 'ata';
	const prepared = trespass.attacktree.prepareAnnotatedTree(attacktree, flavor);

	test('should transform all parameters to hash maps', (t) => {
		t.true(!prepared.node[0].parameter);
		t.true(!prepared.node[0].node[0].parameter);

		t.true(_.isObject(prepared.node[1].parameter));
		t.true(prepared.node[1].parameter['cost'].value === 1000);

		t.true(_.isObject(prepared.node[1].node[0].parameter));
		t.true(prepared.node[1].node[0].parameter['difficulty'].value === 'M');
	});
});


test.group('findLeafNodes()', (test) => {
	const NOT_A_LEAF = 'not-a-leaf-node';
	const tree = {
		label: NOT_A_LEAF,
		node: [
			{
				label: NOT_A_LEAF,
				node: [{ label: 'leaf-1' }]
			},
			{
				label: NOT_A_LEAF,
				node: [
					{ label: 'leaf-2' },
					{ label: 'leaf-3' },
				]
			},
			{
				label: NOT_A_LEAF,
				node: [
					{
						label: NOT_A_LEAF,
						node: [
							{ label: 'leaf-4' },
						]
					},
					{ label: 'leaf-5' },
				]
			},
			{
				label: 'leaf-6',
				node: [],
			},
		]
	};

	test('should find all leaf nodes', (t) => {
		const leafNodes = trespass.attacktree.findLeafNodes([tree]);
		t.true(leafNodes.length === 6);

		const labels = leafNodes.map(R.prop('label'));
		t.true(!R.contains(NOT_A_LEAF, labels));
	});

	test('should work with non-array argument', (t) => {
		const leafNodes = trespass.attacktree.findLeafNodes(tree);
		t.true(leafNodes.length === 6);
	});
});


test.group('getAllPaths()', (test) => {
	test('should find all paths', (t) => {
		const tree = {
			label: 'root',
			node: [
				{
					label: 'a',
					node: [
						{
							label: 'ab',
							node: []
						}
					]
				},
				{
					label: 'b',
					node: [
						{
							label: 'ba',
							node: []
						},
						{
							label: 'bb',
							node: []
						},
					]
				},
			]
		};

		const paths = trespass.attacktree.getAllPaths([tree]);
		t.true(paths.length === 3);

		const labelPaths = paths
			.map((p) => {
				return p.map(R.prop('label')).join(', ');
			});
		t.true(R.contains('root, a, ab', labelPaths));
		t.true(R.contains('root, b, ba', labelPaths));
		t.true(R.contains('root, b, bb', labelPaths));
	});
});


test.group('subtreeFromLeafNodes()', (test) => {
	test('should return a subtree of the original tree from a list of leaf nodes', (t) => {
		const attacktree = {
			node: [
				{
					label: 'root',
					node: [
						{
							label: 'child-1',
							node: [
								{ label: 'grand-child-1' }
							],
						},
						{
							label: 'child-2',
							node: [],
						},
						{
							label: 'child-3',
							node: [
								{ label: 'grand-child-2' },
								{ label: 'grand-child-3' },
							],
						},
					],
				}
			]
		};
		const prepared = trespass.attacktree.prepareTree(attacktree);
		const rootNode = trespass.attacktree.getRootNode(prepared);
		const leafLabels = ['child-1', 'grand-child-2'];
		const subtree = trespass.attacktree.subtreeFromLeafLabels(rootNode, leafLabels);

		const expected = {
			label: 'root',
			node: [
				{
					label: 'child-1',
					node: [],
				},
				{
					label: 'child-3',
					node: [
						{
							label: 'grand-child-2',
							node: [],
						},
					],
				},
			],
		};
		t.true(R.equals(subtree, expected));
	});
});


test.group('detectFlavor()', (test) => {
	const files = {
		treemaker: path.join(testDataPath, 'attacktree-treemaker.xml'),
		ata: path.join(testDataPath, 'attacktree-cyb.xml'),
		apl: path.join(testDataPath, 'attacktree-apl.xml'),
		adtool: path.join(testDataPath, 'attacktree-adtool.xml'),
		vanilla: path.join(testDataPath, 'attacktree-vanilla.xml'),
	};

	function getTree(filePath) {
		return new Promise((resolve, reject) => {
			fs.readFile(filePath, (err, content) => {
				if (err) { return reject(err); }
				return resolve(content.toString());
			});
		})
			.then((xmlStr) => {
				return trespass.attacktree.parse(xmlStr);
			});
	}

	test('should detect treemaker', (t) => {
		return getTree(files.treemaker)
			.then((tree) => {
				const flavor = trespass.attacktree.detectFlavor(tree);
				t.true(flavor === 'treemaker');
			});
	});

	test('should detect ata', (t) => {
		return getTree(files.ata)
			.then((tree) => {
				const flavor = trespass.attacktree.detectFlavor(tree);
				t.true(flavor === 'ata');
			});
	});

	test('should detect apl', (t) => {
		return getTree(files.apl)
			.then((tree) => {
				const flavor = trespass.attacktree.detectFlavor(tree);
				t.true(flavor === 'apl');
			});
	});

	test('should detect adtool', (t) => {
		return getTree(files.adtool)
			.then((tree) => {
				const flavor = trespass.attacktree.detectFlavor(tree);
				return t.true(flavor === 'adtool');
			});
	});

	test('should detect vanilla', (t) => {
		return getTree(files.vanilla)
			.then((tree) => {
				const flavor = trespass.attacktree.detectFlavor(tree);
				return t.true(flavor === 'vanilla');
			});
	});
});
