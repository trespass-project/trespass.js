'use strict';

var trespass = require('../../src/trespass.js');
var xml = require('xml');
var _ = require('lodash');
var R = require('ramda');
var fs = require('fs');
var path = require('path');


var data = {
	version: 0.1,
	locations: [
		{ id: 'location-1' },
		{ id: 'location-2', atLocations: ['atLocation-1', 'atLocation-2'] },
	],
	actors: [
		{ id: 'actor-1' },
		{ id: 'actor-2', atLocations: ['atLocation-1', 'atLocation-2'] },
	],
	data: [
		{ id: 'data-1' },
		{ id: 'data-2' },
	],
	items: [
		{ id: 'item-1' },
		{ id: 'item-2' },
	],
	predicates: [
		{ id: 'predicate-1' },
		{ id: 'predicate-2', in: { enabled: 'enabled process' } },
	],
};

data.locations = data.locations
	.map( R.partial(trespass.model.toPrefixedObject, ['location']) );
data.actors = data.actors
	.map( R.partial(trespass.model.toPrefixedObject, ['actor']) );
data.data = data.data
	.map( R.partial(trespass.model.toPrefixedObject, ['data']) );
data.items = data.items
	.map( R.partial(trespass.model.toPrefixedObject, ['item']) );
data.predicates = data.predicates
	.map( R.partial(trespass.model.toPrefixedObject, ['predicate']) );
data.assets = data.data.concat(data.items);
delete data.data;
delete data.items;

var newData = trespass.model.prepareForXml({ system: data });
// var newData = trespass.model.prepareForXml(data);
console.log( JSON.stringify(newData, null, '   ') );

var xmlStr = xml(newData);

// var referenceData = [
// 	{ version: 0.1 /* or: [0.1]*/ },

// 	{
// 		locations: [
// 			{ location: [{ id: 'location-1' }] },
// 			{ location: [
// 				{ _attr: { name: 'name' } },
// 				{ id: 'location-2' },
// 				{ atLocations: 'atLocation-1 atLocation-2' }
// 			]}
// 		]
// 	},

// 	{
// 		actors: [
// 			{ actor: [{ id: 'actor-1' }] },
// 			{ actor: [
// 				{ id: 'actor-2' },
// 				{ atLocations: 'atLocation-1 atLocation-2' }
// 			]}
// 		]
// 	},
// ];

// var xmlStr = xml(referenceData);

console.log(xmlStr);
