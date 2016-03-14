'use strict';

const _ = require('lodash');
const api = require('./index.js');
const toolsApi = api.tools;
const fetch = require('node-fetch');
const btoa = require('btoa');
const chalk = require('chalk');


const user = 'frbr';
const pw = 'ru-rha-wort-rtin';
const credentials = btoa(`${user}:${pw}`);
const authParams = {
	headers: {
		Authorization: `Basic ${credentials}`,
	}
};


function getAllTasks() {
	const url = api.makeUrl(toolsApi, `secured/task`);
	const params = _.merge(
		{},
		api.requestOptions.fetch.crossDomain,
		api.requestOptions.fetch.withCredentials,
		authParams
	);

	return fetch(url, params);
}


function cancelTask(taskId) {
	const url = api.makeUrl(toolsApi, `secured/task/${taskId}/cancel`);
	const params = _.merge(
		{},
		api.requestOptions.fetch.crossDomain,
		api.requestOptions.fetch.withCredentials,
		authParams
	);

	let status;
	return fetch(url, params)
		.then((res) => {
			status = res.status;
			return res.json();
		})
		.then((data) => {
			console.log('————');
			console.log(url);
			console.log(status, data);
		});
}


getAllTasks()
	.then((res) => {
		return res.json();
	})
	.then((tasks) => {
		tasks.forEach((task) => {
			console.log(task.id, chalk.green(task.status), '... cancelling');
			cancelTask(task.id);
		});
	});
