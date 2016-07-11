import { test } from 'ava-spec';
const R = require('ramda');
const fs = require('fs');
const path = require('path');
const trespass = require('../');

const rootDir = path.join(__dirname, '..');


test.group('ATE()', (test) => {
	test.group('parse()', (test) => {
		test('should work', (t) => {
			const ateFilePath = path.join(rootDir, 'test', 'data', 'ate-output.txt');
			const fileContent = fs.readFileSync(ateFilePath).toString();
			const results = trespass.analysis.ate.parse(fileContent);

			t.true(results.length === 22);

			results.forEach((item) => {
				const keys = R.keys(item);
				t.true(R.contains('probability', keys));
				t.true(R.contains('cost', keys));
				t.true(R.contains('labels', keys));
			});

			t.true(results[0].probability === 0.31);
			t.true(results[0].cost === 37000.0);
			t.ture(results[0].labels.length === 37);
		});
	});
});
