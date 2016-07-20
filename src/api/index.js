/**
 * Functions for using a number of APIs.
 * @module trespass/api
 */

const R = require('ramda');
const urljoin = require('url-join');


/** [trespass/api/tools]{@link module:trespass/api/tools} */
module.exports.tools = require('./tools.js');

/** [trespass/api/knowledgebase]{@link module:trespass/api/knowledgebase} */
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


const fileTypeFromName =
/**
 * infer mime type and response type from file extension.
 *
 * @param {String} fileName - file name
 * @returns {Object}
 */
module.exports.fileTypeFromName =
function fileTypeFromName(fileName) {
	const extension = R.last(fileName.split('.'));
	const fileType = fileTypes[extension] || {
		mimeType: 'text/plain',
		responseType: 'text',
	};
	return fileType;
};


const makeUrl =
/**
 * contructs an api endpoint url
 *
 * @param {axios}
 * @param {Object} api - api object (`{ host, prefix }`)
 * @param {String} endpoint - name of the endpoint
 * @returns {String} url
 */
module.exports.makeUrl =
function makeUrl(api, endpoint) {
	const url = urljoin(api.host, api.prefix, endpoint);
	return url;
};


// request options
const requestOptions =
module.exports.requestOptions = {
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
