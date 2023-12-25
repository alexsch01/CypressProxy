require(process.argv[1]+'/../packages/ts/register')

module.exports = require('./lib/proxy')

module.exports.CA = require('./lib/ca')
