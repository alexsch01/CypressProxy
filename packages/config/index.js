if (process.env.CYPRESS_INTERNAL_ENV !== 'production') {
  require(process.argv[1]+'/../packages/ts/registerDir')(__dirname)
}

module.exports = require('./src')
