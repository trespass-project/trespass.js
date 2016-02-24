'use strict';


const makeUrl = module.exports.makeUrl =
function makeUrl(api, endpoint) {
	return api.host + api.prefix + endpoint;
};


// request options
const requestOptions = module.exports.requestOptions = {
	crossDomain: {
		// crossDomain: true, // jquery.ajax
		mode: 'cors', // fetch
		// xDomain: true // axios
	},

	withCredentials: { // to send session cookie
		// xhrFields: { withCredentials: true }, // jquery.ajax
		credentials: 'include' // fetch
		// withCredentials: true, // axios
	},

	fileUpload: { // to upload files as FormData to tools API
		method: 'post', // all
		// processData: false, // jquery.ajax
		// contentType: false,
	}
};


module.exports.apis = {
	/*
	itrust tools API
	https://trespass.itrust.lu/api/json
	*/
	tools: {
		host: 'https://trespass.itrust.lu/',
		prefix: 'api/json/',
	},

	/*
	knowledge base API
	http://localhost:8080/tkb/
	*/
	knowledgebase: {
		host: 'http://127.0.0.1:8080/',
		prefix: 'tkb/',
	}
};
