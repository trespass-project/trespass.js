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
function listModels(ajax) {
	const url = api.makeUrl(paths, 'model');
	const params = _.merge(
		{ url },
		api.requestOptions.acceptJSON,
		// api.requestOptions.contentTypeJSON,
		api.requestOptions.crossDomain
	);
	return ajax(params);
};


const getModel =
module.exports.getModel =
function getModel(ajax, modelId) {
	return new Promise((resolve, reject) => {
		if (!modelId) {
			return reject('no model id provided');
		}

		const url = api.makeUrl(paths, `model/${modelId}`);
		const params = _.merge(
			{ url },
			api.requestOptions.acceptJSON,
			api.requestOptions.crossDomain
		);

		ajax(params)
			.then((res) => {
				return resolve(modelId);
			})
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
function createModel(ajax, desiredModelId) {
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
			api.requestOptions.contentTypeJSON,
			api.requestOptions.crossDomain
		);

		ajax(params)
			.then((res) => {
				if (res.status === 200) {
					const isNew = true;
					return resolve({
						isNew,
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
function getFile(ajax, modelId, fileName, gitFileId=undefined) {
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
			// contentType: 'text/xml',
		},
		api.requestOptions.acceptPlainText,
		api.requestOptions.crossDomain
	);
	return ajax(params);
};


/**
 * @param {string} `modelId`
 * @returns {Promise} - model xml string
 */
const getModelFile =
module.exports.getModelFile =
function getModelFile(ajax, modelId) {
	return getFile(ajax, modelId, 'model.xml');
};


const putFile =
module.exports.putFile =
function putFile(ajax, modelId, data, fileName, fileType) {
	const query = queryString.stringify({
		model_id: modelId,
		filename: fileName,
		filetype: fileType,
	});
	const url = `${api.makeUrl(paths, 'files')}?${query}`;
	const params = _.merge(
		{
			url,
			data,
			method: 'put',
			// contentType: 'text/xml',
			// headers: { 'Content-type': 'text/plain' },
			headers: { 'Content-type': 'text/xml' },
		},
		// api.requestOptions.acceptPlainText,
		api.requestOptions.crossDomain
	);
	console.log(params);
	return ajax(params);
};


const saveModelFile =
module.exports.saveModelFile =
function saveModelFile(ajax, modelId, modelXmlStr) {
	return putFile(ajax, modelId, modelXmlStr, 'model.xml', 'model_file');
};


const getTypes =
module.exports.getTypes =
function getTypes(ajax, modelId) {
	const url = api.makeUrl(paths, `type?model_id=${modelId}`);
	const params = _.merge(
		{ url },
		api.requestOptions.crossDomain,
		api.requestOptions.acceptJSON
	);
	return ajax(params);
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
function createItem(ajax, modelId, item) {
	if (!modelId) {
		return Promise.reject(new Error('no model id provided'));
	}

	const url = api.makeUrl(paths, `model/${modelId}/${item.id}`);
	const data = R.omit(['id'], item);
	const params = _.merge(
		{
			url,
			method: 'put',
			// data: JSON.stringify(data),
			data,
		},
		// api.requestOptions.acceptJSON,
		// api.requestOptions.acceptPlainText,
		// api.requestOptions.contentTypeJSON,
		api.requestOptions.crossDomain
	);
	return ajax(params)
		.then((res) => {
			if (res.status !== 200) {
				return Promise.reject(new Error(`something went wrong: ${res.status}`));
			}
			return Promise.resolve(res);
		})
		.catch((err) => {
			return Promise.reject(err);
		});
};


const renameItemId =
module.exports.renameItemId =
function renameItemId(ajax, modelId, itemId, newId) {
	const url = api.makeUrl(paths, `model/${modelId}/${itemId}/?rename_to=${newId}`);
	const params = _.merge(
		{
			url,
			method: 'post',
		},
		api.requestOptions.acceptJSON,
		// api.requestOptions.contentTypeJSON,
		api.requestOptions.crossDomain
	);
	return ajax(params);
};


const deleteItem =
module.exports.deleteItem =
function deleteItem(ajax, modelId, itemId) {
	const url = api.makeUrl(paths, `model/${modelId}/${itemId}`);
	const params = _.merge(
		{
			url,
			method: 'delete'
		},
		// api.requestOptions.acceptJSON,
		// api.requestOptions.acceptPlainText,
		// api.requestOptions.contentTypeJSON,
		api.requestOptions.crossDomain
	);
	return ajax(params);
};


const getAttackerProfiles =
module.exports.getAttackerProfiles =
function getAttackerProfiles(ajax, modelId) {
	const url = api.makeUrl(paths, `attackerprofile?model_id=${modelId}`);
	const params = _.merge(
		{ url },
		api.requestOptions.acceptJSON,
		// api.requestOptions.contentTypeJSON,
		api.requestOptions.crossDomain
	);
	return ajax(params);
};


const getToolChains =
module.exports.getToolChains =
function getToolChains(ajax, modelId) {
	const url = api.makeUrl(paths, `toolchain?model_id=${modelId}`);
	const params = _.merge(
		{ url },
		api.requestOptions.crossDomain,
		api.requestOptions.acceptJSON
		// api.requestOptions.contentTypeJSON
	);
	return ajax(params);
};


const runToolChain =
module.exports.runToolChain =
function runToolChain(ajax, modelId, toolChainId, attackerProfileId, _callbacks) {
	const callbacks = _.defaults(_callbacks, {
		onToolChainStart: noop,
		onToolChainEnd: noop,
	});

	const url = api.makeUrl(paths, `toolchain/${toolChainId}?model_id=${modelId}&attackerprofile_id=${attackerProfileId}`);
	const params = _.merge(
		{
			url,
			method: 'post'
		},
		api.requestOptions.acceptJSON,
		api.requestOptions.contentTypeJSON,
		api.requestOptions.crossDomain
	);

	callbacks.onToolChainStart();
	return ajax(params);
};


const getTaskStatus =
module.exports.getTaskStatus =
function getTaskStatus(ajax, taskUrl) {
	const url = taskUrl;
	const params = _.merge(
		{ url },
		api.requestOptions.acceptJSON,
		api.requestOptions.contentTypeJSON,
		api.requestOptions.crossDomain
	);
	return ajax(params);
};


const getAnalysisResults =
module.exports.getAnalysisResults =
function getAnalysisResults(ajax, taskStatusData, analysisToolNames=analysisToolNames) {
	const tools = taskStatusData.tool_status
		.filter(toolStatus => R.contains(toolStatus.name, analysisToolNames));

	const promises = tools
		.map((tool) => {
			const params = _.merge(
				{
					url: tool.result_file_url,
					method: 'get'
				},
				// api.requestOptions.acceptJSON,
				// api.requestOptions.contentTypeJSON,
				api.requestOptions.crossDomain
			);

			return new Promise((resolve, reject) => {
				ajax(params)
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
