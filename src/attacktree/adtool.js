/**
 * adtool-flavored trees
 * @module trespass/attacktree/adtool
 */


const prepareParameter =
/**
 * make parameter look like the `ata` variant
 *
 * @param {Object} param - annotation parameter
 * @param {Object} keys - attack tree flavor name
 * @returns {Object} transformed parameter
 */
module.exports.prepareParameter =
function prepareParameter(param, { attrKey, charKey }) {
	return {
		[attrKey]: {
			name: param[attrKey].domainId,
			class: undefined, // TODO: what about this?
		},
		[charKey]: param[charKey],
	};
};
