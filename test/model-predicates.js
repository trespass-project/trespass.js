import { test } from 'ava-spec';
const _ = require('lodash');
const common = require('./common.js');
const trespass = require('../');


test.group('predicates', (test) => {
	test.cb('values should be split on xml import', (t) => {
		/* eslint indent:0 */
		const xmlStr = [
			'<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
			'<system xmlns="https://www.trespass-project.eu/schemas/TREsPASS_model" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="https://www.trespass-project.eu/schemas/TREsPASS_model.xsd" author="trespass.js" version="0.0.0" date="2016-02-08 16:29:30">',
				'<title>Untitled</title>',
				'<predicates>',
					'<predicate arity="2" id="isUserIdAt">',
						'<value>aaa bbb</value>',
					'</predicate>',
					'<predicate arity="2" id="isContractedBy">',
						'<value>ccc ddd</value>',
						'<value>eee ddd</value>',
					'</predicate>',
				'</predicates>',
			'</system>',
		].join('\n');
		trespass.model.parse(xmlStr, (err, model) => {
			const predicates = model.system.predicates;
			t.true(predicates.length === 2);
			t.true(_.isNumber(predicates[0].arity));

			t.true(_.isArray(predicates[0].value));
			t.true(_.isArray(predicates[0].value[0]));
			t.true(predicates[0].value[0].length === 2);

			t.true(_.isArray(predicates[1].value));
			t.true(_.isArray(predicates[1].value[0]));
			t.true(predicates[1].value[0].length === 2);

			t.end();
		});
	});

	// test('values should be joint again, on xml export', (t) => {
	// 	t.true(false);
	// });
});


test.group('.addPredicate()', (test) => {
	let model = trespass.model.create();
	const relationType = 'contracted-by';
	const basePred = {
		id: relationType,
		arity: 2,
	};
	const pred1 = _.extend({}, basePred, { value: ['node-1', 'node-2'] });
	const pred2 = _.extend({}, basePred, { value: ['node-2', 'node-3'] });
	model = trespass.model.addPredicate(model, pred1);
	model = trespass.model.addPredicate(model, pred2);
	const predicates = model.system.predicates;

	test('should use existing predicate', (t) => {
		t.true(predicates.length === 1); // not 2
		t.true(predicates[0].value.length === 2);
	});

	test('should complain about values not being split already', (t) => {
		const badPred = _.extend({}, basePred, { value: 'node-1 node-2' });
		t.throws(() => {
			trespass.model.addPredicate(model, badPred);
		});
	});
});
