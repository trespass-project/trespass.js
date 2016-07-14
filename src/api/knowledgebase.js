const _ = require('lodash');
const R = require('ramda');
const api = require('./index.js');
const queryString = require('query-string');

const analysisToolNames = [
	'A.T. Analyzer',
	'A.T. Evaluator',
];


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

					return reject(new Error(`model '${desiredModelId}' already exists`))
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
	const params = _.merge(
		{
			url,
			method: 'get',
			// responseType: 'text',
			// headers: { 'Accept': 'application/xml' }
		},
		// api.requestOptions.acceptPlainText,
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
function putFile(axios, modelId, data, fileName, fileType) {
	const query = queryString.stringify({
		model_id: modelId,
		filename: fileName,
		filetype: fileType, // model_file|scenario_file
	});
	const url = `${api.makeUrl(paths, 'files')}?${query}`;
	const params = _.merge(
		{
			url,
			data,
			method: 'put',
			// TODO:
			// headers: { 'Content-type': 'text/plain' },
			headers: { 'Content-type': 'text/xml' },
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


// const getItem =
// module.exports.getItem =
// function getItem(fetch, modelId, itemId) {
// 	const url = api.makeUrl(paths, `model/${modelId}/${itemId}`);
// 	const params = _.merge(
// 		{ method: 'get' },
// 		api.requestOptions.fetch.acceptJSON,
// 		api.requestOptions.fetch.contentTypeJSON,
// 		api.requestOptions.fetch.crossDomain
// 	);
// 	return fetch(url, params);
// };


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
		// api.requestOptions.contentTypeJSON,
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
					url: tool.result_file_url,
					method: 'get'
				},
				api.requestOptions.crossDomain
			);

			return new Promise((resolve, reject) => {
				axios(params)
					// .done((blob, textStatus, xhr) => {
					.then((blob) => {
						// TODO: don't hard-code this
						const type = (tool.name === 'A.T. Analyzer')
							? 'application/zip'
							: 'text/plain';

						// jquery doesn't return blobs (fetch() does)
						// const realBlob = new Blob([blob], { type });
						const realBlob = blob;

						return resolve({
							name: tool.name,
							blob: realBlob,
						});
					});
			});
		});

	return Promise.all(promises);
};
