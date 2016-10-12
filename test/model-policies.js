const fs = require('fs');
const path = require('path');
import { test } from 'ava-spec';
const R = require('ramda');
const _ = require('lodash');
const trespass = require('../');
const common = require('./common.js');
const cheerio = require('cheerio');


const rootDir = path.join(__dirname, '..');
const testModelFilePath = path.join(
	rootDir, 'test', 'data', 'policies-test.xml'
);
const testModelXML = fs.readFileSync(testModelFilePath).toString();


test.group('policies', (test) => {
	test.cb('policies should be prepared on model import', (t) => {
		const xmlStr = testModelXML;
		trespass.model.parse(xmlStr, (err, model) => {
			const policies = model.system.policies;

			t.true(policies.length === 5);

			{
				const policy = policies[0];
				// console.log(JSON.stringify(policy));
				t.true(policy.atLocations.length === 2);
				t.true(policy.credentials.credPredicate.length === 2);

				const credPred0 = policy.credentials.credPredicate[0];
				t.true(credPred0.values.length === 2);
				t.true(credPred0.relationType === 'is-user-id-at');
				t.true(credPred0.values[0].type === 'variable');

				t.true(_.isArray(policy.enabled));
			}

			{
				const policy = policies[1];
				const credData0 = policy.credentials.credData[0];
				t.true(credData0.values.length === 1);
				t.true(credData0.values[0].type === 'variable');
			}

			{
				const policy = policies[2];
				// console.log(JSON.stringify(policy));
				const credItem0 = policy.credentials.credItem[0];
				t.true(credItem0.values[0].values[0].type === 'variable');
			}

			{
				const policy = policies[4];
				// console.log(JSON.stringify(policy, null, '  '));
				t.true(policy.enabled.length === 1);
				const enabled = policy.enabled[0];
				t.true(enabled.location.type === 'locvar');
				t.true(enabled.location.value === 'locX');
				t.true(enabled.values.length === 1);
				t.true(enabled.values[0].type === 'tuple');
				t.true(enabled.values[0].values.length === 2);
				const vals = enabled.values[0].values.map(R.prop('type'));
				t.true(R.equals(vals, ['value', 'variable']));
			}

			t.end();
		});
	});
});


test.group('.addPolicy()', (test) => {
	const policy = {
		'id': 'p-003',
		'atLocations': [
			'RoomDatacenter',
			'laptop',
		],
		'credentials': {
			'credLocation': [
				{ id: 'loc1' },
				{ id: 'loc2' },
			],
			'credPredicate': [
				{
					'relationType': 'is-user-id-at',
					'values': [
						{
							'type': 'variable',
							'value': 'X'
						},
						{
							'type': 'value',
							'value': 'laptop'
						}
					]
				}
			],
			'credData': [
				{
					'name': 'userpin',
					'values': [
						{
							'type': 'variable',
							'value': 'X'
						}
					]
				}
			],
			'credItem': [
				{
					'name': 'usercard',
					'values': [
						{
							'type': 'credData',
							'name': 'userpin',
							'values': [
								{
									'type': 'variable',
									'value': 'X'
								}
							]
						}
					]
				}
			]
		}
	};

	let model = trespass.model.create();
	model = trespass.model.addPolicy(model, policy);
	model.system.id = 'test';
	const _model = _.merge({}, model);
	// const policies = model.system.policies;

	// let preparedModel = trespass.model.prepareModelForXml(model);
	// preparedModel = trespass.model.prepareForXml(preparedModel);

	// test('should', (t) => {
	// 	const policies = preparedModel.system.policies.policy;
	// 	// console.log(
	// 	// 	JSON.stringify(
	// 	// 		policies[0].credentials.credPredicate,
	// 	// 		null,
	// 	// 		'  '
	// 	// 	)
	// 	// );
	// 	// t.true(predicates.predicate.length === 1);
	// });

	test('should properly export to xml', (t) => {
		const xmlStr = trespass.model.toXML(_model);
		// console.log(xmlStr);

		const $system = cheerio.load(xmlStr, common.cheerioOptions)('system');
		{
			const $policy = $system.find('policies > policy');
			t.true($policy.length === 1);
			t.true($policy.eq(0).attr('id') === 'p-003');
		}

		const $atLocations = $system.find('policies > policy > atLocations');
		t.true($atLocations.text() === 'RoomDatacenter laptop');

		{
			const $credPredicate = $system.find('policies > policy > credentials > credPredicate');
			t.true($credPredicate.attr('name') === 'is-user-id-at');
			const $children = $credPredicate.children();
			t.true($children.length === 2);
			t.true($children.eq(0)[0].name === 'variable');
			t.true($children.eq(0).text() === 'X');
			t.true($children.eq(1)[0].name === 'value');
			t.true($children.eq(1).text() === 'laptop');
		}

		{
			const $credData = $system.find('policies > policy > credentials > credData');
			const $children = $credData.children();
			t.true($credData.attr('name') === 'userpin');
			t.true($children.length === 1);
			t.true($children.eq(0)[0].name === 'variable');
			t.true($children.eq(0).text() === 'X');
		}

		const $credLocation = $system.find('policies > policy > credentials > credLocation');
		t.true($credLocation.eq(0).attr('id') === 'loc1');
		t.true($credLocation.eq(1).attr('id') === 'loc2');

		const $credItem = $system.find('policies > policy > credentials > credItem');
		t.true($credItem.eq(0).attr('name') === 'usercard');
		t.true($credItem.eq(0).children().length === 1);
		const $credItemData = $credItem.eq(0).children('credData').eq(0);
		t.true($credItemData.attr('name') === 'userpin');
		t.true($credItemData.children().length === 1);
		t.true($credItemData.children('variable').text() === 'X');
	});
});
