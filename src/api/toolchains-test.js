'use strict';

const toolsApi = require('./index.js').tools;
const fetch = require('node-fetch');
const btoa = require('btoa');
const FormData = require('form-data');
const fs = require('fs');
const chalk = require('chalk');


let formData = new FormData();
// formData.append('file', fs.createReadStream('./converter.xml'));
formData.append('file', fs.createReadStream('./scenario_cloud_export.zip'));

const user = 'frbr';
const pw = 'ru-rha-wort-rtin';
const credentials = btoa(`${user}:${pw}`);

const params = {
	method: 'post',
	body: formData
};

const propagateParams = {
	headers: {
		'Authorization': `Basic ${credentials}`,
	}
};

// const toolId = 4;
// toolsApi.runTool(fetch, toolId, params, propagateParams)
// 	.then((data) => {
// 		console.log(data);
// 	})
// 	.catch((err) => {
// 		console.log(err);
// 	});


// const toolChainData = {
// 	id: 47,
// 	name: 'attack tree analyzer',
// 	description: '...',
// 	tools: [
// 		{ id: 4, name: 'converter', description: '...', publisher: 'dtu', hasInput: true },
// 		{ id: 3, name: 'whatever', description: '...', publisher: 'xyz', hasInput: true }
// 	]
// };
const toolChainData = {
    "id": 47,
    "name": "attack tree analyzer",
    "description": "treemaker \u00E2?? apl \u00E2?? converter \u00E2?? a.t. analyzer",
    "tools": [{
        "id": 15,
        "name": "Treemaker",
        "publisher": "T. University of Denmark",
        "hasInput": true,
        "description": "This tool generates an attack tree in the XML format that can be used for analyses, visualisation, and for the TREsPASS process. It takes as input the description of the model in XML format.",
        "types": ["model"],
        "resources": {
            "Input file for testing": "https:\/\/trespass.itrust.lu\/data\/treemaker.zip"
        }
    }, {
        "id": 8,
        "name": "Attack Pattern Lib.",
        "publisher": "Cybernetica",
        "hasInput": true,
        "description": "The Attack Pattern Library (APL) is intended to promote the reuse of modular elements to improve the process of model development.",
        "types": ["analysis"],
        "resources": {
            "Input file for testing": "https:\/\/trespass.itrust.lu\/data\/apl.xml"
        }
    }, {
        "id": 4,
        "name": "Converter",
        "publisher": "Cybernetica",
        "hasInput": true,
        "description": "This converter is used to convert the output format of the TREsPASS model (XML) into the input format understandable by the ApproxTree+ tool.",
        "types": ["misc"],
        "resources": {
            "Input file for testing": "https:\/\/trespass.itrust.lu\/data\/converter.xml"
        }
    }, {
        "id": 3,
        "name": "A.T. Analyzer",
        "publisher": "Cybernetica",
        "hasInput": true,
        "description": "The attack tree computation tool can be used to calculate optimal attack vector (from the attacker point of view) taking attacker profile into account.",
        "types": ["analysis"],
        "resources": {
            "Input file for testing": "https:\/\/trespass.itrust.lu\/data\/approxtree.txt"
        }
    }]
};

const callbacks = {
	// onToolChainStart: () => {
	// 	console.log('onToolChainStart');
	// },
	// onToolChainEnd: () => {
	// 	console.log('onToolChainEnd');
	// },
	// onToolStart: (toolId) => {
	// 	console.log('onToolStart', toolId);
	// },
	// onToolEnd: (toolId) => {
	// 	console.log('onToolEnd', toolId);
	// },
	// onTaskStatus: (taskStatusData) => {
	// 	console.log('onTaskStatus', taskStatusData);
	// },
}

toolsApi.runToolChain(fetch, toolChainData, callbacks, params, propagateParams)
	.then((data) => {
		console.log('->', data);
	})
	.catch((err) => {
		console.log(err);
	});
