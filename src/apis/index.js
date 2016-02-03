'use strict';


const makeUrl = module.exports.makeUrl =
function makeUrl(api, endpoint) {
	return api.host + api.prefix + endpoint;
};


// jquery request options
const requestOptions = module.exports.requestOptions = {
	crossDomain: {
		crossDomain: true,
		xhrFields: { withCredentials: true }, // to send session cookie
	},

	fileUpload: {
		type: 'POST',
		processData: false,
		contentType: false,
	}
};


/*
itrust tools API
https://trespass.itrust.lu/api/json
*/
module.exports.apis = {
	tools: {
		host: 'https://trespass.itrust.lu/',
		prefix: 'api/json/',
	}
};
