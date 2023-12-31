const os = require('os')
const path = require('path')
const ospath = require('ospath')
const Promise = require('bluebird')
const log = require('debug')('cypress:server:appdata')
const { fs } = require('../util/fs')
const cwd = require('../cwd')
const md5 = require('md5')
const sanitize = require('sanitize-filename')

const PRODUCT_NAME = 'Cypress'
const OS_DATA_PATH = ospath.data()

const ELECTRON_APP_DATA_PATH = path.join(OS_DATA_PATH, PRODUCT_NAME)

if (!PRODUCT_NAME) {
  throw new Error('Root package is missing name')
}

const getSymlinkType = () => {
  if (os.platform() === 'win32') {
    return 'junction'
  }

  return 'dir'
}

const isProduction = () => {
  return false
}

const toHashName = (projectRoot) => {
  if (!projectRoot) {
    throw new Error('Missing project path')
  }

  if (!path.isAbsolute(projectRoot)) {
    throw new Error(`Expected project absolute path, not just a name ${projectRoot}`)
  }

  const name = sanitize(path.basename(projectRoot))
  const hash = md5(projectRoot)

  return `${name}-${hash}`
}

module.exports = {
  toHashName,

  getBundledFilePath (projectRoot, filePath) {
    return this.projectsPath(toHashName(projectRoot), 'bundles', filePath)
  },

  ensure () {
    const ensure = () => {
      return this.removeSymlink()
      .then(() => {
        return Promise.join(
          fs.ensureDirAsync(this.path()),
          !isProduction() ? this.symlink() : undefined,
        )
      })
    }

    // try twice to ensure the dir
    return ensure()
    .tapCatch(() => Promise.delay(100))
    .catch(ensure)
  },

  symlink () {
    const src = path.dirname(this.path())
    const dest = cwd('.cy')

    log('symlink folder from %s to %s', src, dest)
    const symlinkType = getSymlinkType()

    return fs.ensureSymlinkAsync(src, dest, symlinkType)
  },

  removeSymlink () {
    return fs.removeAsync(cwd('.cy')).catch(() => {})
  },

  path (...paths) {
    const { env } = process

    // allow overriding the app_data folder
    let folder = env.CYPRESS_CONFIG_ENV || 'development'

    if (process.env.CYPRESS_INTERNAL_E2E_TESTING_SELF) {
      folder = `${folder}-e2e-test`
    }

    const p = path.join(ELECTRON_APP_DATA_PATH, 'cy', folder, ...paths)

    log('path: %s', p)

    return p
  },

  electronPartitionsPath () {
    return path.join(ELECTRON_APP_DATA_PATH, 'Partitions')
  },

  projectsPath (...paths) {
    return this.path('projects', ...paths)
  },

  remove () {
    return Promise.join(
      fs.removeAsync(this.path()),
      this.removeSymlink(),
    )
  },

}
