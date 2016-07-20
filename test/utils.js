import { test } from 'ava-spec';

const utils = require('../').utils;


test.group('stringToNumber()', (test) => {
	test('should work', (t) => {
		const result1 = utils.stringToNumber('1234');
		t.true(result1 === 1234);
		const result2 = utils.stringToNumber('12xxx34');
		t.true(result2 === '12xxx34');
		const result3 = utils.stringToNumber('xxx');
		t.true(result3 === 'xxx');
		const result4 = utils.stringToNumber('0.50');
		t.true(result4 === 0.5);
		const result5 = utils.stringToNumber('.666');
		t.true(result5 === 0.666);
	});
});


test.group('toHashMap()', (test) => {
	const list = [
		{ name: 'cost', value: 1 },
		{ name: 'likelihood', value: 0.5 },
		{ name: 'difficulty', value: 'M' },
		{ name: 'time', value: 'D' },
	];
	const result = utils.toHashMap('name', list);

	test('should work', (t) => {
		t.true(result['cost'].value === 1);
		t.true(result['likelihood'].value === 0.5);
		t.true(result['difficulty'].value === 'M');
		t.true(result['time'].value === 'D');
	});
});
