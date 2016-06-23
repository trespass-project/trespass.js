'use strict';

const _ = require('lodash');
const R = require('ramda');
const api = require('./index.js');
const queryString = require('query-string');


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
		api.requestOptions.jquery.acceptJSON,
		// api.requestOptions.jquery.contentTypeJSON,
		api.requestOptions.jquery.crossDomain
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
			api.requestOptions.jquery.acceptJSON,
			api.requestOptions.jquery.crossDomain
		);

		ajax(params)
			.done((model, textStatus, xhr) => {
				return resolve(modelId);
			})
			.fail((xhr, textStatus, err) => {
				if (xhr.status === 404) {
					return resolve(null); // model does not exist
				} else {
					return reject(`something went wrong: ${xhr.status}`);
				}
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
				dataType: 'text',
				// apparently jquery complains about the response body
				// of the OPTIONS request not being json — even if it is :[
			},
			// api.requestOptions.jquery.acceptJSON,
			api.requestOptions.jquery.contentTypeJSON,
			api.requestOptions.jquery.crossDomain
		);

		ajax(params)
			// .fail((xhr, textStatus, err) => {
			// 	return reject();
			// })
			.done((data, textStatus, xhr) => {
				if (xhr.status === 200) {
					const isNew = true;
					return resolve({ modelId: desiredModelId, isNew });
				} else {
					return reject(new Error(`something went wrong: ${xhr.status}`));
				}
			});
	});
};


/**
 * @param {string} `modelId`
 * @returns {Promise} - model xml string
 */
const getModelFile =
module.exports.getModelFile =
function getModelFile(ajax, modelId) {
	const query = queryString.stringify({
		model_id: modelId,
		filename: 'model.xml',
	});
	const url = `${api.makeUrl(paths, 'files')}?${query}`;
	const params = _.merge(
		{
			url,
			contentType: 'text/xml',
		},
		api.requestOptions.jquery.acceptPlainText,
		api.requestOptions.jquery.crossDomain
	);
	return ajax(params);
};


const saveModelFile =
module.exports.saveModelFile =
function saveModelFile(ajax, modelId, modelXmlStr) {
	return putFile(ajax, modelId, modelXmlStr, 'model.xml', 'model_file');
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
			contentType: 'text/xml',
		},
		api.requestOptions.jquery.acceptPlainText,
		api.requestOptions.jquery.crossDomain
	);
	return ajax(params);
};


const getTypes =
module.exports.getTypes =
function getTypes(ajax, modelId) {
	const url = api.makeUrl(paths, `type?model_id=${modelId}`);
	const params = _.merge(
		{ url },
		api.requestOptions.jquery.crossDomain,
		api.requestOptions.jquery.acceptJSON
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
			data: JSON.stringify(data),
		},
		// api.requestOptions.jquery.acceptJSON,
		api.requestOptions.jquery.acceptPlainText,
		api.requestOptions.jquery.contentTypeJSON,
		api.requestOptions.jquery.crossDomain
	);
	return ajax(params)
		.done((data, textStatus, xhr) => {
			if (xhr.status !== 200) {
				return Promise.reject(new Error(`something went wrong: ${xhr.status}`));
			}
		});
};


const renameItemId =
module.exports.renameItemId =
function renameItemId(ajax, modelId, itemId, newId) {
	const url = api.makeUrl(paths, `model/${modelId}/${itemId}/?rename_to=${newId}`);
	const params = _.merge(
		{
			url,
			method: 'post'
		},
		api.requestOptions.jquery.acceptJSON,
		api.requestOptions.jquery.contentTypeJSON,
		api.requestOptions.jquery.crossDomain
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
		// api.requestOptions.jquery.acceptJSON,
		api.requestOptions.jquery.acceptPlainText,
		api.requestOptions.jquery.contentTypeJSON,
		api.requestOptions.jquery.crossDomain
	);
	return ajax(params);
};


const getAttackerProfiles =
module.exports.getAttackerProfiles =
function getAttackerProfiles(ajax, modelId) {
	const url = api.makeUrl(paths, `attackerprofile?model_id=${modelId}`);
	const params = _.merge(
		{ url },
		api.requestOptions.jquery.acceptJSON,
		api.requestOptions.jquery.contentTypeJSON,
		api.requestOptions.jquery.crossDomain
	);
	return ajax(params);
};


const getToolChains =
module.exports.getToolChains =
function getToolChains(ajax, modelId) {
	const url = api.makeUrl(paths, `toolchain?model_id=${modelId}`);
	const params = _.merge(
		{ url },
		api.requestOptions.jquery.crossDomain,
		api.requestOptions.jquery.acceptJSON,
		api.requestOptions.jquery.contentTypeJSON
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
		api.requestOptions.jquery.acceptJSON,
		api.requestOptions.jquery.contentTypeJSON,
		api.requestOptions.jquery.crossDomain
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
		api.requestOptions.jquery.acceptJSON,
		api.requestOptions.jquery.contentTypeJSON,
		api.requestOptions.jquery.crossDomain
	);
	return ajax(params);
};


const getAnalysisResults =
module.exports.getAnalysisResults =
function getAnalysisResults(ajax, taskStatusData, analysisToolNames=['A.T. Analyzer', 'A.T. Evaluator']) {
	const tools = taskStatusData.tool_status
		.filter(toolStatus => R.contains(toolStatus.name, analysisToolNames));

	const promises = tools
		.map((tool) => {
			const params = _.merge(
				{
					url: tool.result_file_url,
					method: 'get'
				},
				// api.requestOptions.jquery.acceptJSON,
				// api.requestOptions.jquery.contentTypeJSON,
				api.requestOptions.jquery.crossDomain
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
