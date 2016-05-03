'use strict';

const _ = require('lodash');
const R = require('ramda');
const api = require('./index.js');


/*
knowledge base API
http://localhost:8080/tkb/
*/
const host = module.exports.host = (window.location.toString().indexOf('itrust') > -1)
	? 'https://trespass-tkb.itrust.lu/'
	: 'http://localhost:8080/';
const prefix = module.exports.prefix = 'tkb/';
const paths = { host, prefix };
// ———

const noop = () => {};
const retryRate = 1000;


const createModel =
module.exports.createModel =
function createModel(fetch, modelId) {
	const url = api.makeUrl(paths, `model/${modelId}`);
	const params = _.merge(
		{ method: 'put' },
		api.requestOptions.fetch.acceptJSON,
		api.requestOptions.fetch.contentTypeJSON,
		api.requestOptions.fetch.crossDomain
	);
	return fetch(url, params);
};


const getItem =
module.exports.getItem =
function getItem(fetch, modelId, itemId) {
	const url = api.makeUrl(paths, `model/${modelId}/${itemId}`);
	const params = _.merge(
		{ method: 'get' },
		api.requestOptions.fetch.acceptJSON,
		api.requestOptions.fetch.contentTypeJSON,
		api.requestOptions.fetch.crossDomain
	);
	return fetch(url, params);
};


const createItem =
module.exports.createItem =
function createItem(fetch, modelId, item) {
	const url = api.makeUrl(paths, `model/${modelId}/${item.id}`);
	const data = R.omit(['id'], item);
	const params = _.merge(
		{
			method: 'put',
			body: JSON.stringify(data), // needs to be stringified
		},
		api.requestOptions.fetch.acceptJSON,
		api.requestOptions.fetch.contentTypeJSON,
		api.requestOptions.fetch.crossDomain
	);
	return fetch(url, params);
};


const deleteItem =
module.exports.deleteItem =
function deleteItem(fetch, modelId, itemId) {
	const url = api.makeUrl(paths, `model/${modelId}/${itemId}`);
	const params = _.merge(
		{ method: 'delete' },
		api.requestOptions.fetch.acceptJSON,
		api.requestOptions.fetch.contentTypeJSON,
		api.requestOptions.fetch.crossDomain
	);
	return fetch(url, params);
};


const getAttackerProfiles =
module.exports.getAttackerProfiles =
function getAttackerProfiles(fetch, modelId) {
	const url = api.makeUrl(paths, `attackerprofile?model_id=${modelId}`);
	const params = _.merge(
		{ method: 'get' },
		api.requestOptions.fetch.acceptJSON,
		api.requestOptions.fetch.contentTypeJSON,
		api.requestOptions.fetch.crossDomain
	);
	return fetch(url, params);
};


const runToolChain =
module.exports.runToolChain =
function runToolChain(fetch, modelId, toolChainId, attackerProfileId, _callbacks) {
	const callbacks = _.defaults(_callbacks, {
		onToolChainStart: noop,
		onToolChainEnd: noop,
	});

	const url = api.makeUrl(paths, `toolchain/${toolChainId}?model_id=${modelId}&attackerprofile_id=${attackerProfileId}`);

	const params = _.merge(
		{ method: 'post' },
		api.requestOptions.fetch.acceptJSON,
		api.requestOptions.fetch.crossDomain
	);

	callbacks.onToolChainStart();
	return fetch(url, params);
};
