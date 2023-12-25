"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.iframesController = void 0;
const tslib_1 = require("tslib");
const debug_1 = tslib_1.__importDefault(require("debug"));
const files_1 = tslib_1.__importDefault(require("./files"));
const debug = (0, debug_1.default)('cypress:server:iframes');
exports.iframesController = {
    e2e: ({ getSpec, remoteStates, config }, req, res) => {
        const extraOptions = {
            specType: 'integration',
        };
        debug('handling iframe for project spec %o', {
            spec: getSpec(),
            extraOptions,
        });
        // Chrome plans to make document.domain immutable in Chrome 109, with the default value
        // of the Origin-Agent-Cluster header becoming 'true'. We explicitly disable this header
        // so that we can continue to support tests that visit multiple subdomains in a single spec.
        // https://github.com/cypress-io/cypress/issues/20147
        res.setHeader('Origin-Agent-Cluster', '?0');
        files_1.default.handleIframe(req, res, config, remoteStates, extraOptions);
    },
    component: ({ config, nodeProxy }, req, res) => {
        // requests to the index.html are from initializing the iframe. They include the specPath as query parameter
        const specPath = req.query.specPath;
        if (typeof specPath === 'string') {
            // for those requests we need to provide the spec-path via this header
            req.headers.__cypress_spec_path = encodeURI(specPath);
            req.url = `${config.devServerPublicPathRoute}/index.html`;
            delete req.query.specPath;
        }
        else {
            // all other requests should be forwarded to the devserver, preserving their relative paths so assets with relative urls work.
            req.url = `${config.devServerPublicPathRoute}/${req.params[0]}`;
        }
        // use the node proxy here instead of the network proxy
        // to avoid the user accidentally intercepting and modifying
        // our internal index.html handler
        nodeProxy.web(req, res, {}, (e) => {
            if (e) {
                // eslint-disable-next-line
                debug('Proxy request error. This is likely the socket hangup issue, we can basically ignore this because the stream will automatically continue once the asset will be available', e);
            }
        });
    },
};
