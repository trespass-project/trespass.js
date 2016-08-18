import test from 'ava';
test('', (t) => t.pass());

module.exports.attrKey = '_attr';

module.exports.cheerioOptions = {
	xmlMode: true,
	normalizeWhitespace: false,
	lowerCaseTags: true,
	// lowerCaseAttributeNames: true
};
