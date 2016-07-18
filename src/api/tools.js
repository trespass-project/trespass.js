/**
 * @module trespass/api/tools
 */

// TODO: this file is not up to date

const R = require('ramda');
const _ = require('lodash');
const FormData = require('form-data');
const api = require('./index.js');


/*
itrust tools paths
https://trespass.itrust.lu/api/json
*/
const host = module.exports.host = 'https://trespass.itrust.lu/';
const prefix = module.exports.prefix = 'api/json/';
const paths = { host, prefix };
// ———


const noop = () => {};
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
function getTask(fetch, taskId, propagateParams={}) {
	const url = api.makeUrl(paths, `secured/task/${taskId}`);
	return fetch(url, defaultParams(propagateParams))
		.then(checkStatusCodeAndReturnJSON);
};


const getTaskStatus = module.exports.getTaskStatus =
function getTaskStatus(fetch, taskId, propagateParams={}) {
	const url = api.makeUrl(paths, `secured/task/${taskId}/status`);
	return fetch(url, defaultParams(propagateParams))
		.then(checkStatusCodeAndReturnJSON);
};


const monitorTaskStatus = module.exports.monitorTaskStatus =
function monitorTaskStatus(fetch, taskId, _callbacks, propagateParams={}) {
	const callbacks = _.defaults(_callbacks, {
		onTaskStatus: noop,
	});

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
						callbacks.onTaskStatus(taskStatusData);
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

								// this currently doesn't work for some reason:
								// getTask(fetch, taskStatusData.id, propagateParams)
								// 	.then((taskData) => {
								// 		console.log(taskData);
								// 		// ...
								// 	});

								// so we do this instead:
								const outputFileUrl = `https://trespass.itrust.lu/api/json/secured/task/${taskStatusData.id}/download/output`;
								retrieveFile(fetch, outputFileUrl, defaultParams(propagateParams), propagateParams)
									.then((res) => {
										return res.text();
									})
									.then((stdErr) => {
										alert(stdErr);
										// throw new Error(stdErr);
										reject(new Error(stdErr));
									});

								// reject(new Error('An unspecified error occured.'));
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
					}/* else {
					}*/
				});
		}

		intervalId = setInterval(check, retryRate);
	});
};


const runTool = module.exports.runTool =
function runTool(fetch, toolData, _callbacks, params, propagateParams={}) {
	const callbacks = _.defaults(_callbacks, {
		onToolStart: noop,
		onToolEnd: noop,
	});

	const toolId = toolData.id;
	const url = api.makeUrl(paths, `secured/tool/${toolId}/run`);
	const _params = _.merge(
		{},
		api.requestOptions.fetch.fileUpload,
		api.requestOptions.fetch.crossDomain,
		api.requestOptions.fetch.withCredentials,
		params,
		propagateParams || {}
	);

	callbacks.onToolStart(toolData);
	return fetch(url, _params)
		.then(checkStatusCodeAndReturnJSON)
		.then((runData) => {
			if (runData.error) {
				throw new Error(runData.error);
			}
			return monitorTaskStatus(fetch, runData.id, callbacks, propagateParams)
				.then((arg) => {
					callbacks.onToolEnd(toolData);
					return arg;
				});
		});
};


const retrieveFile = module.exports.retrieveFile =
function retrieveFile(fetch, url, params, propagateParams={}) {
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
function makeFileUrl(pathsObj, outputURL) {
	if (!outputURL) {
		throw new Error('No output URL');
	}
	return `${pathsObj.host.replace(/\/$/, '')}${outputURL}`;
};


const runToolChain = module.exports.runToolChain =
function runToolChain(fetch, toolChainData, _callbacks, params, propagateParams={}) {
	// toolChainData:
	// {
	// 	"id": 47,
	// 	"name": "attack tree analyzer",
	// 	"description": "description text",
	// 	"tools": [...]
	// }

	const callbacks = _.defaults(_callbacks, {
		onToolChainStart: noop,
		onToolChainEnd: noop,
	});

	// TODO: clean this up a bit
	callbacks.onToolChainStart();
	const first = runTool(fetch, toolChainData.tools[0], callbacks, params, propagateParams);

	const chain = R.tail(toolChainData.tools)
		.reduce((result, toolData) => {
			return result
				.then((taskData) => {
					if (taskData.error) {
						throw new Error(taskData.error);
					}

					const url = makeFileUrl(paths, taskData.outputURL);
					return retrieveFile(fetch, url, defaultParams(propagateParams), propagateParams)
						.then((res) => {
							// console.log(res.headers.raw()); // TODO: get file name
							// return res.json();
							// return res.text();
							return res.blob();
						})
						.then((fileBlob) => {
							const formData = new FormData();
							formData.append('file', fileBlob, 'output');
							const params = {
								method: 'post',
								body: formData
							};
							return runTool(fetch, toolData, callbacks, params, propagateParams);
						});
				});
		}, first);

	return chain
		.then((taskData) => {
			const url = makeFileUrl(paths, taskData.outputURL);
			return retrieveFile(fetch, url, defaultParams(propagateParams), propagateParams)
				.then((res) => {
					callbacks.onToolChainEnd();
					return res.text();
				});
		});
};
