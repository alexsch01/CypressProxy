if (process.env.CYPRESS_ENV !== 'production') {
  require(process.argv[1]+'/../packages/ts/register')
}

module.exports = require('./lib')
