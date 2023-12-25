const Promise = require('bluebird')
const pkg = require(process.argv[1]+'/../packages/root')

module.exports = () => {
  return Promise.resolve(pkg)
}
