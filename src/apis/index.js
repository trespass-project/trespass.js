'use strict';


const makeUrl = module.exports.makeUrl =
function makeUrl(api, endpoint) {
	return api.host + api.prefix + endpoint;
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
