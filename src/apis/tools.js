'use strict';

const R = require('ramda');
const _ = require('lodash');
const FormData = require('form-data');

const api = require('./index.js');
const toolsApi = api.apis.tools;

const retryRate = 1000;


const checkStatusCodeAndReturnJSON = module.exports.checkStatusCodeAndReturnJSON =
function checkStatusCodeAndReturnJSON(res) {
	if (res.status !== 200) {
		throw new Error(`HTTP status code: ${res.status}`);
	} else {
		return res.json();
	}
};


const defaultParams = module.exports.defaultParams =
function defaultParams(propagateParams) {
	return _.merge(
		{},
		api.requestOptions.fetch.crossDomain,
		api.requestOptions.fetch.withCredentials,
		propagateParams || {}
	);
};


const getTask = module.exports.getTask =
function getTask(fetch, taskId, propagateParams) {
	const url = api.makeUrl(toolsApi, `secured/task/${taskId}`);
	return fetch(url, defaultParams(propagateParams))
		.then(checkStatusCodeAndReturnJSON);
};


const getTaskStatus = module.exports.getTaskStatus =
function getTaskStatus(fetch, taskId, propagateParams) {
	const url = api.makeUrl(toolsApi, `secured/task/${taskId}/status`);
	return fetch(url, defaultParams(propagateParams))
		.then(checkStatusCodeAndReturnJSON);
};


const monitorTaskStatus = module.exports.monitorTaskStatus =
function monitorTaskStatus(fetch, taskId, propagateParams) {
	return new Promise((resolve, reject) => {
		let intervalId;

		function check() {
			getTaskStatus(fetch, taskId, propagateParams)
				.catch((err) => {
					clearInterval(intervalId);
					reject(err);
				})
				.then((taskStatusData) => {
					if (taskStatusData.status) {
						console.log('  ', taskStatusData.status);
						switch (taskStatusData.status) {
							case 'processing':
							case 'pending':
								// do nothing
								break;

							case 'rejected':
							case 'task_not_found':
							case 'app_not_found':
								clearInterval(intervalId);
								reject(new Error(`Error: ${taskStatusData.status}`));
								break;

							case 'error':
								clearInterval(intervalId);
								reject(new Error('An unspecified error occured.'));
								break;

							case 'abort':
							case 'done':
								clearInterval(intervalId);

								// workaround, to get the correct duration
								const {beginDate, endDate} = taskStatusData;

								getTask(fetch, taskId, propagateParams)
									.then((taskData) => {
										const merged = _.merge(taskData, {beginDate, endDate});
										resolve(merged);
									});
								break;

							default:
								clearInterval(intervalId);
								reject(new Error(`Unknown status: ${taskStatusData.status}.`));
								break;
						}
					} else {
					}
				});
		}

		intervalId = setInterval(check, retryRate);
	});
};


const runTool = module.exports.runTool =
function runTool(fetch, toolId, params, propagateParams) {
	console.log('—————————————————————————');
	console.log(toolId);
	const url = api.makeUrl(toolsApi, `secured/tool/${toolId}/run`);
	const _params = _.merge(
		{},
		api.requestOptions.fetch.fileUpload,
		api.requestOptions.fetch.crossDomain,
		api.requestOptions.fetch.withCredentials,
		params,
		propagateParams || {}
	);

	return fetch(url, _params)
		.then(checkStatusCodeAndReturnJSON)
		.then((runData) => {
			if (runData.error) {
				throw new Error(runData.error);
			}
			return monitorTaskStatus(fetch, runData.id, propagateParams);
		});
};


const retrieveFile = module.exports.retrieveFile =
function retrieveFile(fetch, url, params, propagateParams) {
	const _params = _.merge(
		{},
		api.requestOptions.fetch.crossDomain,
		api.requestOptions.fetch.withCredentials,
		params,
		propagateParams || {}
	);

	return fetch(url, _params);
};


const makeFileUrl = module.exports.makeFileUrl =
function makeFileUrl(apiObj, outputURL) {
	if (!outputURL) {
		throw new Error('No output URL');
	}
	return `${apiObj.host.replace(/\/$/, '')}${outputURL}`;
};


const runToolChain = module.exports.runToolChain =
function runToolChain(fetch, toolChainData, params, propagateParams) {
	// toolChainData:
	// {
	// 	"id": 47,
	// 	"name": "attack tree analyzer",
	// 	"description": "description text",
	// 	"tools": [...]
	// }

	const first = runTool(fetch, toolChainData.tools[0].id, params, propagateParams);

	const chain = R.tail(toolChainData.tools)
		.reduce((result, toolData) => {
			return result
				.then((taskData) => {
					const url = makeFileUrl(toolsApi, taskData.outputURL);
					return retrieveFile(fetch, url, defaultParams(propagateParams), propagateParams)
						.then((res) => {
							// console.log(res.headers.raw()); // TODO: get file name
							let formData = new FormData();
							formData.append('file', res.body, { filename: 'output' });
							return formData;
						})
						.then((formData) => {
							const params = {
								method: 'post',
								body: formData
							};
							return runTool(fetch, toolData.id, params, propagateParams);
						});
				});
		}, first);

	return chain
		.then((taskData) => {
			const url = makeFileUrl(toolsApi, taskData.outputURL);
			return retrieveFile(fetch, url, defaultParams(propagateParams), propagateParams)
				.then((res) => {
					return res.text();
				});
		});
};
