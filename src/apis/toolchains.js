'use strict';

/*
run tool → taskId
	periodically check task status → taskData
		on error: stop, alert user
		when done:
			retrieve taskData.outputURL

*/


const _ = require('lodash');
const api = require('./index.js');
const toolsApi = api.apis.tools;

const retryRate = 1000;


const getTaskStatus = module.exports.getTaskStatus =
function getTaskStatus(fetch, taskId, propagateParams) {
	const url = api.makeUrl(toolsApi, `secured/task/${taskId}`); // /status
	// console.log('getTaskStatus', taskId, url);
	const _params = _.merge(
		{},
		api.requestOptions.crossDomain,
		api.requestOptions.withCredentials,
		propagateParams || {}
	);
	const req = fetch(url, _params);
	return fetch(url, _params);
}


const monitorTaskStatus = module.exports.monitorTaskStatus =
function monitorTaskStatus(fetch, taskId, propagateParams, cb) {
	// console.log('monitorTaskStatus', taskId);

	const intervalId = setInterval(
		() => {
			getTaskStatus(fetch, taskId, propagateParams)
				.catch((err) => { cb(err); })
				.then((res) => {
					// console.log(res.status); // TODO: check status
					return res.json();
				})
				.then((taskData) => {
					// console.log('task status', taskData);
					if (taskData.status) { // data has become available
						clearInterval(intervalId); // so stop checking
						cb(null, taskData);
					}
				});
		},
		retryRate
	);
}


const runTool = module.exports.runTool =
function runTool(fetch, toolId, params, propagateParams, cb) {
	const url = api.makeUrl(toolsApi, `secured/tool/${toolId}/run`);
	// console.log('runTool', toolId);

	const _params = _.merge(
		{},
		api.requestOptions.fileUpload,
		api.requestOptions.crossDomain,
		api.requestOptions.withCredentials,
		params,
		propagateParams || {}
	);

	return fetch(url, _params)
		.catch((err) => { cb(err); })
		.then((res) => {
			// console.log(res.status); // TODO: check status
			return res.json();
		})
		.then((runData) => {
			// console.log(runData);
			if (runData.error) {
				return cb(new Error(runData.error));
			}

			monitorTaskStatus(fetch, runData.id, propagateParams, (err, taskData) => {
				// once task status is there
				// console.log(err, taskData);
			});
		});
}


const runToolChain = module.exports.runToolChain =
function runToolChain(toolChainData) {
	// console.log('runToolChain');

	// toolChainData:
	// {
	// 	"id": 47,
	// 	"name": "attack tree analyzer",
	// 	"description": "description text",
	// 	"tools": [...]
	// }

	// const p = new Promise((resolve, reject) => {

	// });
}
