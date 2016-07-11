import { test } from 'ava-spec';
const _ = require('lodash');
const R = require('ramda');
const trespass = require('../');


test.group('stringToNumber()', (test) => {
	test('should work', (t) => {
		const result1 = trespass.attacktree.stringToNumber('1234');
		t.true(result1 === 1234);
		const result2 = trespass.attacktree.stringToNumber('12xxx34');
		t.true(result2 === '12xxx34');
		const result3 = trespass.attacktree.stringToNumber('xxx');
		t.true(result3 === 'xxx');
	});
});


test.group('parseXml()', (test) => {
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

	return trespass.attacktree.parseXml(xmlStr/*, opts*/)
		.then((tree) => {
			test('should work', (t) => {
				t.true(tree._attr.id === 'tree-id');
			});

			test('should convert strings to numbers', (t) => {
				// t.true(tree._attr.profit === '5000');
				t.true(tree._attr.profit === 5000);
			});

			test('child nodes should be arrays – even with only one child', (t) => {
				t.true(_.isArray(tree.node)); // root node
				t.true(_.isArray(tree.node[0].node));
				t.true(_.isArray(tree.node[0].node[0].node)); // 1
				t.true(!tree.node[0].node[1].node); // 2
			});
		});
});


test.group('findLeafNodes()', (test) => {
	test('should find all leaf nodes', (t) => {
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
			]
		};

		const leafNodes = trespass.attacktree.findLeafNodes([tree]);
		t.true(leafNodes.length === 5);

		const labels = leafNodes.map(R.prop('label'));
		t.true(!R.contains(NOT_A_LEAF, labels));
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
