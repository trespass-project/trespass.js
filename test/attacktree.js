const assert = require('assert');
const R = require('ramda');

const trespass = require('../');

const common = require('./common.js');
const f1 = common.f1;
const f2 = common.f2;
const f3 = common.f3;


describe(f1('trespass.attacktree'), () => {
	describe(f2('.findLeafNodes()'), () => {
		it(f3('should find all leaf nodes'), () => {
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
			assert(leafNodes.length === 5);
			const labels = leafNodes.map(R.prop('label'));
			assert(!R.contains(NOT_A_LEAF, labels));
		});
	});
});
