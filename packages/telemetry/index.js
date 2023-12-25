if (process.env.CYPRESS_INTERNAL_ENV !== 'production') {
  require(process.argv[1]+'/../packages/ts/register')
}

module.exports = require('./src/node')
