/**
 * @module trespass/api/knowledgebase
 */

const _ = require('lodash');
const R = require('ramda');
const api = require('./index.js');
const queryString = require('query-string');
const moment = require('moment');

const analysisTools = {
	'A.T. Analyzer': {
		outputFileName: 'ata_output.zip',
	},
	'A.T. Evaluator': {
		outputFileName: 'ate_output.txt',
	},
};
const analysisToolNames =
module.exports.analysisToolNames = R.keys(analysisTools);


/*
knowledgebase API
http://localhost:8080/tkb/
*/
const hostExceptions = [
	{
		check: () => (window.location.toString().indexOf('itrust') > -1),
		host: 'https://trespass-tkb.itrust.lu/',
	},
	{
		check: () => (window.location.toString().indexOf('dynu.com') > -1),
		host: 'http://trespass-anm.dynu.com/',
	},
];
const defaultHost = 'http://localhost:8080/';
const host = module.exports.host = (typeof window === 'undefined')
	? defaultHost
	: hostExceptions.reduce((result, item) => {
		return (item.check())
			? item.host
			: result;
	}, defaultHost);
const prefix = module.exports.prefix = 'tkb/';
const paths = { host, prefix };
// ———

const noop = () => {};
const retryRate = 1000;


const fileTypeFromName =
module.exports.fileTypeFromName =
function fileTypeFromName(fileName) {
	const extension = R.last(fileName.split('.'));
	const fileType = api.fileTypes[extension] || {
		mimeType: 'text/plain',
		responseType: 'text',
	};
	return fileType;
};


const listCommits =
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
			api.requestOptions.crossDomain
		);

		axios(params)
			.then((res) => resolve(res.data))
			.catch(reject);
	});
};


const getAnalysisResultsSnapshots =
module.exports.getAnalysisResultsSnapshots =
function getAnalysisResultsSnapshots(axios, modelId) {
	const toolchainPrefixPattern = /^\(toolchain_run_\d+\.\d+\)/i;

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
		// (toolchain_run_1468575416.093705)
		const unixTimestampStr = R.last(
			prefix
				.replace(')', '')
				.split('_')
		);
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
module.exports.listModels =
function listModels(axios) {
	const url = api.makeUrl(paths, 'model');
	const params = _.merge(
		{ url },
		api.requestOptions.acceptJSON,
		api.requestOptions.crossDomain
	);
	return axios(params)
		.then((res) => res.data);
};


const getModel =
module.exports.getModel =
function getModel(axios, modelId) {
	return new Promise((resolve, reject) => {
		if (!modelId) {
			return reject('no model id provided');
		}

		const url = api.makeUrl(paths, `model/${modelId}`);
		const params = _.merge(
			{ url },
			api.requestOptions.crossDomain
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


/**
 * creates a new model
 * @param {string} `desiredModelId`
 * @returns {Promise} - `{ modelId, isNew }`
 */
const createModel =
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
			api.requestOptions.crossDomain
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


const getFile =
module.exports.getFile =
function getFile(axios, modelId, fileName, gitFileId=undefined) {
	const query = queryString.stringify({
		model_id: modelId,
		filename: fileName,
		file_id: gitFileId,
	});
	const url = `${api.makeUrl(paths, 'files')}?${query}`;
	const fileType = fileTypeFromName(fileName);
	const params = _.merge(
		{
			url,
			method: 'get',
			responseType: fileType.responseType,
			headers: { 'Accept': fileType.mimeType }
		},
		api.requestOptions.crossDomain
	);
	return axios(params)
		.then((res) => res.data);
};


/**
 * @param {string} `modelId`
 * @returns {Promise} - model xml string
 */
const getModelFile =
module.exports.getModelFile =
function getModelFile(axios, modelId) {
	return getFile(axios, modelId, 'model.xml');
};


const putFile =
module.exports.putFile =
function putFile(axios, modelId, data, fileName, type) {
	const query = queryString.stringify({
		model_id: modelId,
		filename: fileName,
		filetype: type, // model_file|scenario_file
	});
	const url = `${api.makeUrl(paths, 'files')}?${query}`;
	const fileType = fileTypeFromName(fileName);
	const params = _.merge(
		{
			url,
			data,
			method: 'put',
			headers: { 'Content-type': fileType.mimeType },
		},
		api.requestOptions.crossDomain
	);
	return axios(params)
		.then((res) => res.data);
};


const saveModelFile =
module.exports.saveModelFile =
function saveModelFile(axios, modelId, modelXmlStr) {
	return putFile(axios, modelId, modelXmlStr, 'model.xml', 'model_file');
};


const getTypes =
module.exports.getTypes =
function getTypes(axios, modelId) {
	const url = api.makeUrl(paths, `type?model_id=${modelId}`);
	const params = _.merge(
		{ url },
		api.requestOptions.acceptJSON,
		api.requestOptions.crossDomain
	);
	return axios(params)
		.then((res) => res.data);
};


const getItem =
module.exports.getItem =
function getItem(axios, modelId, itemId) {
	const url = api.makeUrl(paths, `model/${modelId}/${itemId}`);
	const params = _.merge(
		{
			url,
			method: 'get',
		},
		api.requestOptions.acceptJSON,
		api.requestOptions.crossDomain
	);
	return axios(params)
		.then((res) => res.data);
};


const createItem =
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
			api.requestOptions.crossDomain
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
module.exports.renameItemId =
function renameItemId(axios, modelId, itemId, newId) {
	const url = api.makeUrl(paths, `model/${modelId}/${itemId}/?rename_to=${newId}`);
	const params = _.merge(
		{
			url,
			method: 'post',
		},
		api.requestOptions.acceptJSON,
		api.requestOptions.crossDomain
	);
	return axios(params)
		.then((res) => res.data);
};


const deleteItem =
module.exports.deleteItem =
function deleteItem(axios, modelId, itemId) {
	const url = api.makeUrl(paths, `model/${modelId}/${itemId}`);
	const params = _.merge(
		{
			url,
			method: 'delete'
		},
		api.requestOptions.crossDomain
	);
	return axios(params)
		.then((res) => res.data);
};


const getAttackerProfiles =
module.exports.getAttackerProfiles =
function getAttackerProfiles(axios, modelId) {
	const url = api.makeUrl(paths, `attackerprofile?model_id=${modelId}`);
	const params = _.merge(
		{ url },
		api.requestOptions.acceptJSON,
		api.requestOptions.crossDomain
	);
	return axios(params)
		.then((res) => res.data);
};


const getToolChains =
module.exports.getToolChains =
function getToolChains(axios, modelId) {
	const url = api.makeUrl(paths, `toolchain?model_id=${modelId}`);
	const params = _.merge(
		{ url },
		api.requestOptions.acceptJSON,
		api.requestOptions.crossDomain
	);
	return axios(params)
		.then((res) => res.data);
};


const runToolChain =
module.exports.runToolChain =
function runToolChain(axios, modelId, toolChainId, attackerProfileId, _callbacks={}) {
	const callbacks = _.defaults(_callbacks, {
		onToolChainStart: noop,
		onToolChainEnd: noop,
	});

	const query = queryString.stringify({
		model_id: modelId,
		attackerprofile_id: attackerProfileId,
	});
	const url = api.makeUrl(paths, `toolchain/${toolChainId}?${query}`);
	const params = _.merge(
		{
			url,
			method: 'post'
		},
		api.requestOptions.acceptJSON,
		api.requestOptions.crossDomain
	);

	callbacks.onToolChainStart();
	return axios(params)
		.then((res) => res.data);
};


const getTaskStatus =
module.exports.getTaskStatus =
function getTaskStatus(axios, taskUrl) {
	const url = taskUrl;
	const params = _.merge(
		{ url },
		api.requestOptions.acceptJSON,
		api.requestOptions.crossDomain
	);
	return axios(params)
		.then((res) => res.data);
};


const getAnalysisResults =
module.exports.getAnalysisResults =
function getAnalysisResults(axios, taskStatusData, analysisToolNames=analysisToolNames) {
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
				api.requestOptions.crossDomain
			);

			return new Promise((resolve, reject) => {
				axios(params)
					.then((res) => res.data)
					.then((blob) => {
						// const tool = analysisTools[tool.name];
						// const fileName = (!!tool)
						// 	? tool.outputFileName
						// 	: 'unknown.txt';
						// const fileType = fileTypeFromName(fileName);

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
