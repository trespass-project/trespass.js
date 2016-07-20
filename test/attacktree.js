import { test } from 'ava-spec';
const _ = require('lodash');
const R = require('ramda');
const trespass = require('../');

const parameters = [
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
	const attacktree = {
		_attr: { profit: '5000' },
		node: [
			{
				_attr: { profit: '6000' },
			}
		]
	};
	const prepared = trespass.attacktree.prepareTree(attacktree);

	test('should convert strings to numbers', (t) => {
		t.true(prepared._attr.profit === 5000);
		t.true(prepared.node[0]._attr.profit === 6000);
	});
});


test.group('prepareParameter()', (test) => {
	test('should work', (t) => {
		const param = parameters[0];
		const prepared = trespass.attacktree.prepareParameter(param);
		t.true(prepared.name === 'cost');
		t.true(prepared.class === 'numeric');
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
				parameter: parameters,
				node: [
					{
						parameter: parameters,
					},
				]
			},
		]
	};
	const prepared = trespass.attacktree.prepareAnnotatedTree(attacktree);

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
