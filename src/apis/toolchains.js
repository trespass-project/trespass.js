'use strict';

/*
run tool → taskId
	periodically check task status → taskData
		on error: stop, alert user
		when done:
			retrieve taskData.outputURL

*/


const R = require('ramda');
const _ = require('lodash');

const api = require('./index.js');
const toolsApi = api.apis.tools;

const retryRate = 1000;


const getTask = module.exports.getTask =
function getTask(fetch, taskId, propagateParams) {
	console.log('getTask');
	const url = api.makeUrl(toolsApi, `secured/task/${taskId}`);
	const _params = _.merge(
		{},
		api.requestOptions.crossDomain,
		api.requestOptions.withCredentials,
		propagateParams || {}
	);
	return fetch(url, _params);
};


const getTaskStatus = module.exports.getTaskStatus =
function getTaskStatus(fetch, taskId, propagateParams) {
	console.log('getTaskStatus');
	const url = api.makeUrl(toolsApi, `secured/task/${taskId}/status`);
	const _params = _.merge(
		{},
		api.requestOptions.crossDomain,
		api.requestOptions.withCredentials,
		propagateParams || {}
	);
	return fetch(url, _params);
};


const monitorTaskStatus = module.exports.monitorTaskStatus =
function monitorTaskStatus(fetch, taskId, propagateParams) {
	console.log('monitorTaskStatus');

	return new Promise((resolve, reject) => {
		let intervalId;

		function check() {
			getTaskStatus(fetch, taskId, propagateParams)
				.catch((err) => {
					console.log(err);
					clearInterval(intervalId);
					reject(err);
				})
				.then((res) => {
					console.log(res.status); // TODO: check status
					return res.json();
				})
				.then((taskStatusData) => {
					console.log(taskStatusData);

					if (taskStatusData.status) {
						console.log('  status:', taskStatusData.status);

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

								// workaround
								const {beginDate, endDate} = taskStatusData;

								getTask(fetch, taskId, propagateParams)
									.then((res) => {
										// console.log(res.status); // TODO: check status
										return res.json();
									})
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
						console.log('  no status');
					}
				});
		}

		intervalId = setInterval(check, retryRate);
	});
}


const runTool = module.exports.runTool =
function runTool(fetch, toolId, params, propagateParams, cb) {
	console.log('runTool');
	const url = api.makeUrl(toolsApi, `secured/tool/${toolId}/run`);

	const _params = _.merge(
		{},
		api.requestOptions.fileUpload,
		api.requestOptions.crossDomain,
		api.requestOptions.withCredentials,
		params,
		propagateParams || {}
	);

	return fetch(url, _params)
		.then((res) => {
			// console.log(res.status); // TODO: check status
			return res.json();
		})
		.then((runData) => {
			if (runData.error) {
				return new Error(runData.error);
			}
			return monitorTaskStatus(fetch, runData.id, propagateParams)
				.catch((err) => {
					console.log(err);
				});
		})
		.then((taskData) => {
			console.log(taskData);
		})
		.catch((err) => {
			console.log(err);
			cb(err);
		});
}


const runToolChain = module.exports.runToolChain =
function runToolChain(toolChainData) {
	// toolChainData:
	// {
	// 	"id": 47,
	// 	"name": "attack tree analyzer",
	// 	"description": "description text",
	// 	"tools": [...]
	// }
}
