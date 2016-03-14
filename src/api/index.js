'use strict';

module.exports.tools = require('./tools.js');
module.exports.knowledgebase = require('./knowledgebase.js');


const makeUrl = module.exports.makeUrl =
function makeUrl(api, endpoint) {
	return `${api.host}${api.prefix}${endpoint}`;
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
		}
	},

	fetch: {
		crossDomain: {
			mode: 'cors',
			// xDomain: true, // axios
		},
		withCredentials: { // to send session cookie
			credentials: 'include'
			// withCredentials: true, // axios
		},
		fileUpload: { // to upload files as FormData to tools API
			method: 'post'
		}
	}
};
