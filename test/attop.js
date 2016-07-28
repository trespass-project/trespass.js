import { test } from 'ava-spec';
const trespass = require('../');


test.group('parseAttackVector()', (test) => {
	test('should work', (t) => {
		const str = [
			'OpenWindow\n',
			'DisableAlarm\r',
			'   Window   \n',
			'\n',
			'EnterBuilding\n\n',
		].join('');

		const result = trespass.analysis.attop.parseAttackVector(str);
		t.true(result.length === 4);
		t.true(result[0] === 'OpenWindow');
		t.true(result[1] === 'DisableAlarm');
		t.true(result[2] === 'Window');
		t.true(result[3] === 'EnterBuilding');
	});
});


test.group('parseInterval()', (test) => {
	test('should work', (t) => {
		const str = '[0.9,1.1]';
		const result = trespass.analysis.attop.parseInterval(str);
		t.true(result.length === 2);
		t.true(result[0] === 0.9);
		t.true(result[1] === 1.1);
	});

	test('should work', (t) => {
		const str = ' [ 0.9 , , 1.1 ] ';
		const result = trespass.analysis.attop.parseInterval(str);
		t.true(result.length === 2);
		t.true(result[0] === 0.9);
		t.true(result[1] === 1.1);
	});
});


test.group('parseTimeSeries()', (test) => {
	test('should work', (t) => {
		const str = [
			'10 [0.0168516,0.0368448]',
			' 30 [0.426269, 0.446269] ',
			'   ',
			'50 [0.77524,0.795239]',
		].join('\n');
		const result = trespass.analysis.attop.parseTimeSeries(str);
		t.true(result.length === 3);
		t.true(result[0].time === 10 && !!result[0].interval);
		t.true(result[1].time === 30 && !!result[1].interval);
		t.true(result[2].time === 50 && !!result[2].interval);
	});
});
