/**
 * knowledgebase api
 * @module trespass/api/knowledgebase
 */

const _ = require('lodash');
const R = require('ramda');
const queryString = require('query-string');
const moment = require('moment');
const api = require('./index.js');
const analysis = require('../analysis/index.js');


// default is `http://localhost:8080/tkb/`, but there are exceptions
const defaultHost = 'http://localhost:8080/';
const itrustHost = 'https://trespass.itrust.lu/tkb/';
const dynuHost = 'http://trespass-anm.dynu.com/';

const hostExceptions = [
	{
		check: () => (window.location.toString().indexOf('itrust') > -1),
		host: itrustHost,
	},
	{
		check: () => (window.location.toString().indexOf('dynu.com') > -1),
		host: dynuHost,
	},
];
const host =
module.exports.host = (typeof window === 'undefined')
	? defaultHost
	: hostExceptions.reduce((result, item) => {
		return (item.check())
			? item.host
			: result;
	}, defaultHost);
const maybeWithCredentials = (host === itrustHost)
	? api.requestOptions.withCredentials
	: {};
const prefix = module.exports.prefix = 'tkb/';
const paths = { host, prefix };
// ———

const noop = () => {};
// const retryRate = 1000;


const listCommits =
/**
 * gets a list of all git commits for a specific model.
 *
 * @param {axios}
 * @param {String} modelId - model id
 * @returns {Promise} resolves to list of commits
 */
module.exports.listCommits =
function listCommits(axios, modelId) {
	return new Promise((resolve, reject) => {
		if (!modelId) {
			return reject('no model id provided');
		}

		const query = queryString.stringify({
			model_id: modelId,
		});
		const url = `${api.makeUrl(paths, 'files/listcommits')}?${query}`;
		const params = _.merge(
			{ url },
			api.requestOptions.acceptJSON,
			api.requestOptions.crossDomain,
			maybeWithCredentials
		);

		axios(params)
			.then((res) => resolve(res.data))
			.catch(reject);
	});
};


const getAnalysisResultsSnapshots =
/**
 * gets a list of snapshots. each snapshot represents a toolchain run.
 * the `tree` property of each items maps filenames to file ids, which can
 * be used to get the file contents at that point in time.
 *
 * @param {axios}
 * @param {String} modelId - model id
 * @returns {Promise} resolves to list of snapshot objects
 */
module.exports.getAnalysisResultsSnapshots =
function getAnalysisResultsSnapshots(axios, modelId) {
	const toolchainPrefixPattern = /^\(toolchain_(.*)_run_\d+\.\d+\)/i;

	const markToolchainFiles = (commit) => {
		if (toolchainPrefixPattern.test(commit.message)) {
			const prefix = commit.message.match(toolchainPrefixPattern)[0];
			return Object.assign(
				{},
				commit,
				{ _toolchainPrefix: prefix }
			);
		}
		return commit;
	};

	const toolchainFilesOnly = (commit) => {
		return !!commit._toolchainPrefix;
	};

	const byToolchainRun = R.groupBy((commit) => `${commit._toolchainPrefix}`);

	const reduceGrouped = (pair) => {
		const prefix = pair[0];
		// (toolchain_toolchain-id_could-contain-underscore_run_1468575416.093705)
		const parts = prefix
				.replace(')', '')
				.split('_');
		/*
		toolchain
			toolchain-id
			could-contain-underscore
		run
		1468575416.093705
		*/

		const toolchainId = R.slice(1, -2, parts)
			.join('_');

		const unixTimestampStr = R.last(parts);
		const unixTimestamp = parseFloat(unixTimestampStr, 10);

		const commits = pair[1];
		return commits
			// newest first
			.sort((a, b) => b.timestamp - a.timestamp)
			.reduce((acc, commit) => {
				// for each file, take the most recent file id
				commit.tree
					.forEach((file) => {
						if (!acc.tree[file.path]) {
							acc.tree[file.path] = file.file_id;
						}
					});
				return acc;
			}, {
				prefix,
				toolchainId,
				formattedToolchainRunDate: moment.unix(unixTimestamp)
					.format('YYYY-MM-DD HH:mm:ss'),
				tree: {},
			});
	};

	return listCommits(axios, modelId)
		.then((commits) => {
			// only take the commits that are part of a toolchain run
			const filtered = commits
				.map(markToolchainFiles)
				.filter(toolchainFilesOnly);

			// group them by commit message prefix
			const grouped = byToolchainRun(filtered);

			// reduce down to a single object, with a tree that only
			// contains the most recent file ids
			const results = R.toPairs(grouped)
				.map(reduceGrouped);

			return results;
		});
};


const listModels =
/**
 * gets the list of models, currently stored in the kb.
 *
 * @param {axios}
 * @returns {Promise} resolves to list of model objects
 */
module.exports.listModels =
function listModels(axios) {
	const url = api.makeUrl(paths, 'model');
	const params = _.merge(
		{ url },
		api.requestOptions.acceptJSON,
		api.requestOptions.crossDomain,
		maybeWithCredentials
	);
	return axios(params)
		.then((res) => res.data);
};


const getModel =
/**
 * checks if a model exists.
 *
 * @param {axios}
 * @param {String} modelId - model id
 * @returns {Promise} resolves model id or `null`
 */
module.exports.getModel =
function getModel(axios, modelId) {
	return new Promise((resolve, reject) => {
		if (!modelId) {
			return reject('no model id provided');
		}

		const url = api.makeUrl(paths, `model/${modelId}`);
		const params = _.merge(
			{ url },
			api.requestOptions.crossDomain,
			maybeWithCredentials
		);

		axios(params)
			.then((res) => resolve(modelId))
			.catch((err) => {
				if (err.response.status === 404) {
					return resolve(null);
				}
				return reject(err);
			});
	});
};


const createModel =
/**
 * creates a new model. will fail if model with that id already exists.
 *
 * @param {axios}
 * @param {String} desiredModelId - the desired model id
 * @returns {Promise} resolves to object `{ modelId, isNew }`
 */
module.exports.createModel =
function createModel(axios, desiredModelId) {
	return new Promise((resolve, reject) => {
		if (!desiredModelId) {
			return reject(new Error('can\'t create model: no model id provided'));
		}

		const url = api.makeUrl(paths, `model/${desiredModelId}`);
		const params = _.merge(
			{
				url,
				method: 'put',
			},
			api.requestOptions.acceptJSON,
			api.requestOptions.crossDomain,
			maybeWithCredentials
		);

		axios(params)
			.then((res) => {
				if (res.status === 200) {
					return resolve({
						isNew: true,
						modelId: desiredModelId,
					});
				}
				return reject(new Error(`something went wrong: ${res.status}`));
			})
			.catch((err) => {
				if (err.response.status === 420) {
					// model already exists

					// const data = JSON.parse(err.response.data);
					// console.log(data.message);

					return reject(new Error(`model '${desiredModelId}' already exists`));
				}
				return reject(err);
			});
	});
};


const deleteModel =
/**
 * deletes a model.
 *
 * @param {axios}
 * @param {String} modelId - model id
 * @returns {Promise}
 */
module.exports.deleteModel =
function deleteModel(axios, modelId) {
	const url = api.makeUrl(paths, `model/${modelId}`);
	const params = _.merge(
		{
			url,
			method: 'delete',
		},
		api.requestOptions.crossDomain,
		maybeWithCredentials
	);

	return axios(params)
		.then((res) => res.data);
};


// TODO: test gitFileId
const getFile =
/**
 * retrieve a file. returns latest version by default. use `gitFileId`
 * argument to get a previous version of the file.
 *
 * @param {axios}
 * @param {String} modelId - model id
 * @param {String} fileName - file name
 * @param {String} [gitFileId] - git file id
 * @returns {Promise} resolves to file content, but type depends on file extension.
 */
module.exports.getFile =
function getFile(axios, modelId, fileName, gitFileId=undefined, asBlob=false) {
	const query = queryString.stringify({
		model_id: modelId,
		filename: fileName,
		file_id: gitFileId,
	});
	const url = `${api.makeUrl(paths, 'files')}?${query}`;
	const fileType = api.fileTypeFromName(fileName);
	const params = _.merge(
		{
			url,
			method: 'get',
			responseType: (asBlob) // enforce blob
				? 'blob'
				: fileType.responseType,
			headers: { 'Accept': fileType.mimeType }
		},
		api.requestOptions.crossDomain,
		maybeWithCredentials
	);
	return axios(params)
		.then((res) => res.data);
};


/**
 * get the latest model file.
 *
 * @param {axios}
 * @param {String} modelId - model id
 * @returns {Promise} resolves to model xml string
 */
const getModelFile =
module.exports.getModelFile =
function getModelFile(axios, modelId) {
	return getFile(axios, modelId, 'model.xml');
};


const putFile =
/**
 * store a file in kb.
 *
 * @param {axios}
 * @param {String} modelId - model id
 * @param {String} data - file content
 * @param {String} fileName - file name
 * @param {String} [type] - file type: `model_file` or `scenario_file`
 * @returns {Promise} (empty)
 */
module.exports.putFile =
function putFile(axios, modelId, data, fileName, type=undefined) {
	const query = queryString.stringify({
		model_id: modelId,
		filename: fileName,
		filetype: type,
	});
	const url = `${api.makeUrl(paths, 'files')}?${query}`;
	const fileType = api.fileTypeFromName(fileName);
	const params = _.merge(
		{
			url,
			data,
			method: 'put',
			headers: { 'Content-type': fileType.mimeType },
		},
		api.requestOptions.crossDomain,
		maybeWithCredentials
	);
	return axios(params)
		.then((res) => res.data);
};


const saveModelFile =
/**
 * save model to file.
 *
 * @param {axios}
 * @param {String} modelId - model id
 * @param {String} modelXmlStr - model xml string
 * @returns {Promise}
 */
module.exports.saveModelFile =
function saveModelFile(axios, modelId, modelXmlStr) {
	return putFile(axios, modelId, modelXmlStr, 'model.xml', 'model_file');
};


const getTypes =
/**
 * get list of model component types.
 *
 * @param {axios}
 * @param {String} modelId - model id
 * @returns {Promise} resolves to array of type objects
 */
module.exports.getTypes =
function getTypes(axios, modelId) {
	const url = api.makeUrl(paths, `type?model_id=${modelId}`);
	const params = _.merge(
		{ url },
		api.requestOptions.acceptJSON,
		api.requestOptions.crossDomain,
		maybeWithCredentials
	);
	return axios(params)
		.then((res) => res.data);
};


const getItem =
/**
 * get a single item by id.
 *
 * @param {axios}
 * @param {String} modelId - model id
 * @param {String} itemId - item id
 * @returns {Promise} resolves to item object
 */
module.exports.getItem =
function getItem(axios, modelId, itemId) {
	const url = api.makeUrl(paths, `model/${modelId}/${itemId}`);
	const params = _.merge(
		{
			url,
			method: 'get',
		},
		api.requestOptions.acceptJSON,
		api.requestOptions.crossDomain,
		maybeWithCredentials
	);
	return axios(params)
		.then((res) => res.data);
};


const createItem =
/**
 * creates a new item.
 *
 * @param {axios}
 * @param {String} modelId - model id
 * @param {Object} item - item data
 * @returns {Promise} resolves to item object
 */
module.exports.createItem =
function createItem(axios, modelId, item) {
	return new Promise((resolve, reject) => {
		if (!modelId) {
			return reject(new Error('no model id provided'));
		}

		const url = api.makeUrl(paths, `model/${modelId}/${item.id}`);
		const params = _.merge(
			{
				url,
				method: 'put',
				data: R.omit(['id'], item),
			},
			api.requestOptions.crossDomain,
			maybeWithCredentials
		);
		axios(params)
			.then((res) => {
				if (res.status !== 200) {
					return reject(new Error(`something went wrong: ${res.status}`));
				}
				return resolve(res.data);
			})
			.catch((err) => {
				return reject(err);
			});
	});
};


const renameItemId =
/**
 * change the id of an item.
 *
 * @param {axios}
 * @param {String} modelId - model id
 * @param {String} itemId - item id
 * @param {String} newId - new item id
 * @returns {Promise}
 */
module.exports.renameItemId =
function renameItemId(axios, modelId, itemId, newId) {
	const url = api.makeUrl(paths, `model/${modelId}/${itemId}/?rename_to=${newId}`);
	const params = _.merge(
		{
			url,
			method: 'post',
		},
		api.requestOptions.acceptJSON,
		api.requestOptions.crossDomain,
		maybeWithCredentials
	);
	return axios(params)
		.then((res) => res.data);
};


const deleteItem =
/**
 * deletes an item.
 *
 * @param {axios}
 * @param {String} modelId - model id
 * @param {String} itemId - item id
 * @returns {Promise}
 */
module.exports.deleteItem =
function deleteItem(axios, modelId, itemId) {
	const url = api.makeUrl(paths, `model/${modelId}/${itemId}`);
	const params = _.merge(
		{
			url,
			method: 'delete'
		},
		api.requestOptions.crossDomain,
		maybeWithCredentials
	);
	return axios(params)
		.then((res) => res.data);
};


const getAttackerProfiles =
/**
 * gets the list of attacker profiles.
 *
 * @param {axios}
 * @param {String} modelId - model id
 * @returns {Promise} resolves to array of attacker profile objects
 */
module.exports.getAttackerProfiles =
function getAttackerProfiles(axios, modelId) {
	const url = api.makeUrl(paths, `attackerprofile?model_id=${modelId}`);
	const params = _.merge(
		{ url },
		api.requestOptions.acceptJSON,
		api.requestOptions.crossDomain,
		maybeWithCredentials
	);
	return axios(params)
		.then((res) => res.data);
};


const deleteAttackerProfile =
/**
 * deletes an attacker profile
 *
 * @param {axios}
 * @param {String} modelId - model id
 * @param {String} profileId - profile id
 * @returns {Promise}
 */
module.exports.deleteAttackerProfile =
function deleteAttackerProfile(axios, modelId, profileId) {
	const url = api.makeUrl(paths, `attackerprofile/${profileId}?model_id=${modelId}`);
	const params = _.merge(
		{
			url,
			method: 'delete',
		},
		api.requestOptions.acceptJSON,
		api.requestOptions.crossDomain,
		maybeWithCredentials
	);
	return axios(params)
		.then((res) => res.data);
};


const saveAttackerProfile =
/**
 * saves a attacker profile
 *
 * @param {axios}
 * @param {String} modelId - model id
 * @param {Objecjt} profile - attacker profile
 * @returns {Promise}
 */
module.exports.saveAttackerProfile =
function saveAttackerProfile(axios, modelId, profile) {
	const url = api.makeUrl(paths, `attackerprofile/${profile.id}?model_id=${modelId}`);
	const params = _.merge(
		{
			url,
			method: 'put',
			data: profile,
		},
		api.requestOptions.acceptJSON,
		api.requestOptions.crossDomain,
		maybeWithCredentials
	);
	return axios(params)
		.then((res) => res.data);
};


const getToolChains =
/**
 * gets the list of toolchains.
 *
 * @param {axios}
 * @param {String} modelId - model id
 * @returns {Promise} resolves to array of toolchain objects
 */
module.exports.getToolChains =
function getToolChains(axios, modelId) {
	const url = api.makeUrl(paths, `toolchain?model_id=${modelId}`);
	const params = _.merge(
		{ url },
		api.requestOptions.acceptJSON,
		api.requestOptions.crossDomain,
		maybeWithCredentials
	);
	return axios(params)
		.then((res) => res.data);
};


const runToolChain =
/**
 * runs a toolchain.
 *
 * @param {axios}
 * @param {String} modelId - model id
 * @param {String} toolchainId - toolchain id
 * @param {String} attackerProfileId - attacker profile id
 * @param {String} [_callbacks] - callbacks for different toolchain events.
	 * - onToolChainStart
	 * - onToolChainEnd
 * @returns {Promise} `{ task_url }`
 */
module.exports.runToolChain =
function runToolChain(axios, modelId, toolchainId, attackerProfileId, _callbacks={}) {
	const callbacks = _.defaults(_callbacks, {
		onToolChainStart: noop,
		onToolChainEnd: noop,
	});

	const query = queryString.stringify({
		model_id: modelId,
		attackerprofile_id: attackerProfileId,
	});
	const url = api.makeUrl(paths, `toolchain/${toolchainId}?${query}`);
	const params = _.merge(
		{
			url,
			method: 'post'
		},
		api.requestOptions.acceptJSON,
		api.requestOptions.crossDomain,
		maybeWithCredentials
	);

	callbacks.onToolChainStart();
	return axios(params)
		.then((res) => res.data)
		.then((data) => {
			// kb used to return `task_url`, but we
			// need to contruct our own url, a la:
			// http://localhost:8080/tkb/task/0d178007ae7044fdb3de5b204ce94e36
			return Object.assign(
				{},
				data,
				{ task_url: api.makeUrl(paths, `task/${data.task_id}`) }
			);
		});
};


const getTaskStatus =
/**
 * gets status of a task.
 *
 * @param {axios}
 * @param {String} taskUrl - task url
 * @returns {Promise} resolves to task status object
 */
module.exports.getTaskStatus =
function getTaskStatus(axios, taskUrl) {
	const url = taskUrl;
	const params = _.merge(
		{ url },
		api.requestOptions.acceptJSON,
		api.requestOptions.crossDomain,
		maybeWithCredentials
	);
	return axios(params)
		.then((res) => res.data);
};


const getAnalysisResults =
/**
 * retrieve analysis results from toolchain run.
 *
 * @param {axios}
 * @param {Object} taskStatusData - task status object
 * @param {Object} [analysisToolNames] - names of the analysis tools we're interested in
 * @returns {Promise} resolves to array of `{ name, blob }`
 */
module.exports.getAnalysisResults =
function getAnalysisResults(axios, taskStatusData, analysisToolNames=analysis.analysisToolNames) {
	const tools = taskStatusData.tool_status
		.filter(toolStatus => R.contains(toolStatus.name, analysisToolNames));

	const promises = tools
		.map((tool) => {
			const params = _.merge(
				{
					method: 'get',
					url: tool.result_file_url,
				},
				api.requestOptions.acceptBlob,
				api.requestOptions.crossDomain,
				maybeWithCredentials
			);

			// TODO: consider using `getFile()` here

			return new Promise((resolve, reject) => {
				axios(params)
					.then((res) => res.data)
					.then((blob) => {
						// const tool = analysis.analysisTools[tool.name];
						// const fileName = (!!tool)
						// 	? tool.outputFileName
						// 	: 'unknown.txt';
						// const fileType = api.fileTypeFromName(fileName);

						// jquery doesn't return blobs (fetch() does)
						// const realBlob = new Blob([blob], { type: fileType.mimeType });

						return resolve({
							name: tool.name,
							blob,
						});
					});
			});
		});

	return Promise.all(promises);
};


const getModelPatterns =
/**
 * gets the list of model patterns
 *
 * @param {axios}
 * @param {String} modelId - model id
 * @returns {Promise} resolves to array of pattern objects
 */
module.exports.getModelPatterns =
function getModelPatterns(axios, modelId) {
	const url = api.makeUrl(paths, `modelpattern?model_id=${modelId}`);
	const params = _.merge(
		{ url },
		api.requestOptions.acceptJSON,
		api.requestOptions.crossDomain,
		maybeWithCredentials
	);
	return axios(params)
		.then((res) => res.data);
};


const saveModelPattern =
/**
 * save model fragment as pattern
 *
 * @param {axios}
 * @param {String} modelId - model id
 * @param {Object} fragment - model fragment
 * @param {String} title - pattern title
 * @param {String} patternId - pattern id
 * @returns {Promise}
 */
module.exports.saveModelPattern =
function saveModelPattern(axios, modelId, fragment, title, patternId) {
	const pattern = {
		id: patternId,
		name: title,
		pattern: fragment,
	};

	const query = queryString.stringify({
		model_id: modelId,
	});
	const url = `${api.makeUrl(paths, `modelpattern/${patternId}`)}?${query}`;
	const params = _.merge(
		{
			url,
			data: pattern,
			method: 'put',
		},
		api.requestOptions.crossDomain,
		maybeWithCredentials,
		api.requestOptions.acceptJSON
	);
	return axios(params)
		.then((res) => res.data);
};


const deleteModelPattern =
/**
 * delete model pattern
 *
 * @param {axios}
 * @param {String} modelId - model id
 * @param {String} patternId - pattern id
 * @returns {Promise}
 */
module.exports.deleteModelPattern =
function deleteModelPattern(axios, modelId, patternId) {
	const query = queryString.stringify({
		model_id: modelId,
	});
	const url = `${api.makeUrl(paths, `modelpattern/${patternId}`)}?${query}`;
	const params = _.merge(
		{
			url,
			method: 'delete',
		},
		api.requestOptions.crossDomain,
		maybeWithCredentials,
		api.requestOptions.acceptJSON
	);
	return axios(params)
		.then((res) => res.data);
};
