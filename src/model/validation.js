/**
 * validation schemas for different model component types.
 * @module trespass/model/validation
 */

// TODO: this file is probly out of date

const schemas =
module.exports.schemas = {};

schemas.location = {
	properties: {
		id: {
			type: 'string',
			required: true,
		},
		atLocations: {
			type: 'array',
			items: {
				// anyOf: [{ type: 'string' }],
				type: 'string',
			},
			required: false,
		},
		type: {
			type: 'string',
			required: false,
		},
	}
};

schemas.edge = {
	properties: {
		source: {
			type: 'string',
			required: true,
		},
		target: {
			type: 'string',
			required: true,
		},
		kind: {
			type: 'string',
			required: false,
		},
		directed: {
			type: 'boolean',
			required: false,
		},
	}
};

schemas.item = {
	properties: {
		id: {
			type: 'string',
			required: true,
		},
		name: {
			type: 'string',
			required: true,
		},
		type: {
			type: 'string',
			required: false,
		},
		atLocations: {
			type: 'array',
			items: {
				type: 'string',
			},
			minItems: 1,
			required: true,
		},
	}
};

schemas.data = {
	properties: {
		id: {
			type: 'string',
			required: true,
		},
		name: {
			type: 'string',
			required: true,
		},
		value: {
			type: 'string',
			required: true,
		},
		type: {
			type: 'string',
			required: false,
		},
		atLocations: {
			type: 'array',
			items: {
				type: 'string',
			},
			minItems: 1,
			required: true,
		},
	}
};

schemas.actor = {
	properties: {
		id: {
			type: 'string',
			required: true,
		},
		type: {
			type: 'string',
			required: false,
		},
		atLocations: {
			type: 'array',
			items: {
				type: 'string',
			},
			minItems: 1,
			required: true,
		},
	}
};

schemas.policy = {
	properties: {
		id: {
			type: 'string',
			required: true,
		},
		enabled: {
			type: 'object',
			required: true,
		},
		credentials: {
			type: 'object',
			required: true,
		},
		atLocations: {
			type: 'array',
			items: {
				type: 'string',
			},
			minItems: 1,
			required: true,
		},
	}
};

schemas.process = {
	properties: {
		id: {
			type: 'string',
			required: true,
		},
		actions: {
			type: 'object',
			required: true,
		},
		atLocations: {
			type: 'array',
			items: {
				type: 'string',
			},
			minItems: 1,
			required: true,
		},
	}
};

schemas.predicate = {
	properties: {
		id: {
			type: 'string',
			required: true,
		},
		arity: {
			type: 'number',
			required: true,
		},
		value: {
			type: 'array',
			items: {
				type: 'array',
				items: {
					type: 'string',
				},
			},
			minItems: 1,
			required: true,
		},
	}
};

schemas.metric = {
	properties: {
		name: {
			type: 'string',
			required: true,
		},
		value: {
			type: 'string',
			required: true,
		},
		namespace: {
			type: 'string',
			required: false,
		},
	}
};

const validationOptions =
module.exports.validationOptions = {
	additionalProperties: true,
};
