import { test } from 'ava-spec';
const cheerio = require('cheerio');
const common = require('./common.js');
const trespass = require('../');


test.group('.scenarioSetModel()', (test) => {
	const empty = trespass.model.createScenario();
	const scenario = trespass.model.scenarioSetModel(empty, 'model-file-name.xml');

	test('should add model', (t) => {
		t.true(!!scenario.scenario.model);
		t.true(scenario.scenario.model === 'model-file-name.xml');
		t.true(scenario.scenario.model !== empty.scenario.model);
	});
});

test.group('.scenarioSetAssetGoal()', (test) => {
	const empty = trespass.model.createScenario();
	const scenario = trespass.model.scenarioSetAssetGoal(empty, 'attackerId', 'assetId');
	// console.log(scenario);

	test('should add goal', (t) => {
		t.true(!!scenario.scenario.assetGoal);
		t.true(scenario.scenario.assetGoal.attacker === 'attackerId');
		t.true(scenario.scenario.assetGoal.asset === 'assetId');
	});
});

test.group('.scenarioToXML()', (test) => {
	test('should require an id', (t) => {
		const origScenario = {
			scenario: { id: undefined }
		};
		t.throws(() => {
			trespass.model.scenarioToXML(origScenario);
		});
	});

	const empty = trespass.model.createScenario();
	let scenario = trespass.model.scenarioSetModel(empty, 'model-file-name.xml');
	scenario = trespass.model.scenarioSetAssetGoal(scenario, 'attackerId', 'assetId');
	scenario.scenario.id = 'scenario-id';

	const xmlStr = trespass.model.scenarioToXML(scenario);
	const $system = cheerio.load(xmlStr, common.cheerioOptions)('scenario');

	test('should properly transform scenario object to XML', (t) => {
		t.true($system.find('model').text() === 'model-file-name.xml');
		t.true($system.find('assetGoal').attr('attacker') === 'attackerId');
		t.true($system.find('assetGoal > asset').text() === 'assetId');
	});
});
