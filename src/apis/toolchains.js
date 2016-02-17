/*
run tool → taskId
	periodically check task status → taskData
		on error: stop, alert user
		when done:
			retrieve taskData.outputURL

*/


const api = require('./index.js');
const toolsApi = api.apis.tools;

const retryRate = 1000;


const checkTaskStatus = module.exports.checkTaskStatus =
function checkTaskStatus(taskId) {
	const url = api.makeUrl(toolsApi, `secured/task/${taskId}/status`);
	// TODO: ...
}


const runTool = module.exports.runTool =
function runTool(toolData) {
	const toolId = toolData.id;
	const url = api.makeUrl(toolsApi, `secured/tool/${toolId}/run`);
	// TODO: ...
}


const runToolChain = module.exports.runToolChain =
function runToolChain(toolChainData) {
	// toolChainData:
	// {
	// 	"id": 47,
	// 	"name": "attack tree analyzer",
	// 	"description": "description text",
	// 	"tools": [...]
	// }

	const p = new Promise((resolve, reject) => {

	});
}
