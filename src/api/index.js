/**
 * Functions for using a number of APIs.
 * @module trespass/api
 */

const urljoin = require('url-join');

module.exports.tools = require('./tools.js');
module.exports.knowledgebase = require('./knowledgebase.js');


const fileTypes = module.exports.fileTypes = {
	txt: {
		mimeType: 'text/plain',
		responseType: 'text',
	},
	xml: {
		mimeType: 'application/xml',
		responseType: 'text',
	},
	json: {
		mimeType: 'application/json',
		responseType: 'json',
	},
	zip: {
		mimeType: 'application/zip',
		responseType: 'blob',
	},
};


const makeUrl = module.exports.makeUrl =
function makeUrl(api, endpoint) {
	const url = urljoin(api.host, api.prefix, endpoint);
	return url;
};


// request options
const requestOptions = module.exports.requestOptions = {
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
		headers: { 'Content-type': fileTypes.json.mimeType },
	},

	contentTypePlainText: {
		headers: { 'Content-type': fileTypes.txt.mimeType },
	},

	contentTypeXML: {
		headers: { 'Content-type': fileTypes.xml.mimeType },
	},

	contentTypeZip: {
		headers: { 'Content-type': fileTypes.zip.mimeType },
	},

	acceptJSON: {
		responseType: 'json',
	},

	acceptPlainText: {
		responseType: 'text',
	},

	acceptBlob: {
		responseType: 'blob',
	},
};

// jquery
/*
{
	crossDomain: {
		crossDomain: true,
	},
	withCredentials: { // to send session cookie
		xhrFields: { withCredentials: true },
	},
	fileUpload: { // to upload files as FormData to tools API
		method: 'post',
		processData: false,
		contentType: false,
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
*/

// fetch
/*
{
	contentTypeJSON: {
		headers: { 'Content-Type': 'application/json' },
	},
	acceptJSON: {
		headers: { 'Accept': 'application/json' },
	},
	crossDomain: {
		mode: 'cors',
	},
	withCredentials: { // to send session cookie
		credentials: 'include',
	},
	fileUpload: { // to upload files as FormData to tools API
		method: 'post',
	},
}
*/
