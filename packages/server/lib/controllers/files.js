const _ = require('lodash')
const path = require('path')
const cwd = require('../cwd')
const debug = require('debug')('cypress:server:controllers')
const { escapeFilenameInUrl } = require('../util/escape_filename')
const { cors } = require(process.argv[1]+'/../packages/network')

module.exports = {

  async handleIframe (req, res, config, remoteStates, extraOptions) {
    const test = req.params[0]
    const iframePath = cwd('lib', 'html', 'iframe.html')
    const specFilter = _.get(extraOptions, 'specFilter')

    debug('handle iframe %o', { test, specFilter })

    const specs = await this.getSpecs(test, config, extraOptions)
    const supportFileJs = this.getSupportFile(config)
    const allFilesToSend = specs

    if (supportFileJs) {
      allFilesToSend.unshift(supportFileJs)
    }

    debug('all files to send %o', _.map(allFilesToSend, 'relative'))

    const superDomain = cors.shouldInjectDocumentDomain(req.proxiedUrl, {
      skipDomainInjectionForDomains: config.experimentalSkipDomainInjection,
    }) ?
      remoteStates.getPrimary().domainName :
      undefined

    const iframeOptions = {
      superDomain,
      title: this.getTitle(test),
      scripts: JSON.stringify(allFilesToSend),
      privilegedChannel: null,
    }

    debug('iframe %s options %o', test, iframeOptions)

    res.render(iframePath, iframeOptions)
  },

  async handleCrossOriginIframe (req, res, config) {
    const iframePath = cwd('lib', 'html', 'spec-bridge-iframe.html')
    const superDomain = cors.shouldInjectDocumentDomain(req.proxiedUrl, {
      skipDomainInjectionForDomains: config.experimentalSkipDomainInjection,
    }) ?
      cors.getSuperDomain(req.proxiedUrl) :
      undefined

    const origin = cors.getOrigin(req.proxiedUrl)

    const iframeOptions = {
      superDomain,
      title: `Cypress for ${origin}`,
      namespace: config.namespace,
      privilegedChannel: null,
    }

    debug('cross origin iframe with options %o', iframeOptions)

    res.render(iframePath, iframeOptions)
  },

  getSpecs (spec, config, extraOptions = {}) {
    // when asking for all specs: spec = "__all"
    // otherwise it is a relative spec filename like "integration/spec.js"
    debug('get specs %o', { spec, extraOptions })

    const convertSpecPath = (spec) => {
      // get the absolute path to this spec and
      // get the browser url + cache buster
      const convertedSpec = path.join(config.projectRoot, spec)

      debug('converted %s to %s', spec, convertedSpec)

      return this.prepareForBrowser(convertedSpec, config.projectRoot, config.namespace)
    }

    return
  },

  prepareForBrowser (filePath, projectRoot, namespace) {
    const SPEC_URL_PREFIX = `/${namespace}/tests?p`

    filePath = filePath.replace(SPEC_URL_PREFIX, '__CYPRESS_SPEC_URL_PREFIX__')
    filePath = escapeFilenameInUrl(filePath).replace('__CYPRESS_SPEC_URL_PREFIX__', SPEC_URL_PREFIX)
    const relativeFilePath = path.relative(projectRoot, filePath)

    return {
      absolute: filePath,
      relative: relativeFilePath,
      relativeUrl: this.getTestUrl(relativeFilePath, namespace),
    }
  },

  getTestUrl (file, namespace) {
    const url = `/${namespace}/tests?p=${file}`

    debug('test url for file %o', { file, url })

    return url
  },

  getTitle (test) {
    if (test === '__all') {
      return 'All Tests'
    }

    return test
  },

  getSupportFile (config) {
    const { projectRoot, supportFile, namespace } = config

    if (!supportFile) {
      return
    }

    return this.prepareForBrowser(supportFile, projectRoot, namespace)
  },
}
