'use strict';

const urljoin = require('url-join');

module.exports.tools = require('./tools.js');
module.exports.knowledgebase = require('./knowledgebase.js');


const makeUrl = module.exports.makeUrl =
function makeUrl(api, endpoint) {
	const url = urljoin(api.host, api.prefix, endpoint);
	return url;
};


// request options
const requestOptions = module.exports.requestOptions = {
	jquery: {
		crossDomain: {
			crossDomain: true
		},
		withCredentials: { // to send session cookie
			xhrFields: { withCredentials: true }
		},
		fileUpload: { // to upload files as FormData to tools API
			method: 'post',
			processData: false,
			contentType: false
		},
		contentTypeJSON: {
			contentType: 'application/json',
		},
		acceptJSON: {
			dataType: 'json',
		},
		acceptPlainText: {
			dataType: 'text',
		},
	},

	axios: {
		crossDomain: {
			xDomain: true,
		},

		// to send session cookie
		withCredentials: {
			withCredentials: true,
		},

		fileUpload: {
			method: 'post',
		},

		contentTypeJSON: {
			headers: { 'Content-type': 'application/json' },
		},

		acceptJSON: {
			responseType: 'json',
		},

		acceptPlainText: {
			responseType: 'text',
		},
	},

	fetch: {
		contentTypeJSON: {
			headers: { 'Content-Type': 'application/json' }
		},
		acceptJSON: {
			headers: { 'Accept': 'application/json' }
		},
		crossDomain: {
			mode: 'cors',
		},
		withCredentials: { // to send session cookie
			credentials: 'include'
		},
		fileUpload: { // to upload files as FormData to tools API
			method: 'post'
		}
	}
};
