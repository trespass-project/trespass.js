const fs = require('fs');
const path = require('path');
import { test } from 'ava-spec';
const _ = require('lodash');
const trespass = require('../');


const rootDir = path.join(__dirname, '..');
const testModelFilePath = path.join(rootDir, 'test', 'data', 'policies-test.xml');
const testModelXML = fs.readFileSync(testModelFilePath).toString();


test.group('policies', (test) => {
	test.cb('policies should be prepared on model import', (t) => {
		const xmlStr = testModelXML;
		trespass.model.parse(xmlStr, (err, model) => {
			const policies = model.system.policies;

			t.true(policies.length === 3);

			{
				const policy = policies[0];
				t.true(policy.atLocations.length === 2);
				t.true(policy.credentials.credPredicate.length === 2);

				const credPred0 = policy.credentials.credPredicate[0];
				t.true(credPred0.values.length === 2);
				t.true(credPred0.relationType === 'is-user-id-at');
				t.true(credPred0.values[0].type === 'variable');
			}

			{
				const policy = policies[1];
				const credData0 = policy.credentials.credData[0];
				t.true(credData0.values.length === 1);
				t.true(credData0.values[0].type === 'variable');
			}

			{
				const policy = policies[2];
				const credItem0 = policy.credentials.credItem[0];
				t.true(credItem0.values[0].values[0].type === 'variable');
			}

			t.end();
		});
	});
});


// test.group('.addPolicy()', (test) => {
// 	const policy = {
// 		id: 'policy-1',
// 		atLocations: ['room', 'laptop'],
// 		credentials: {}
// 	};

// 	let model = trespass.model.create();
// 	model = trespass.model.addPolicy(model, policy);
// 	// const policies = model.system.policies;

// 	test('should', (t) => {
// 		let preparedModel = trespass.model.prepareModelForXml(model);
// 		preparedModel = trespass.model.prepareForXml(preparedModel);

// 		const policies = preparedModel.system.policies.policy;
// 		// console.log(policies[0]);
// 		// t.true(predicates.predicate.length === 1);
// 	});
// });
