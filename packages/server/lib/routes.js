"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCommonRoutes = void 0;
const tslib_1 = require("tslib");
const http_proxy_1 = tslib_1.__importDefault(require("http-proxy"));
const debug_1 = tslib_1.__importDefault(require("debug"));
const express_1 = require("express");
const send_1 = tslib_1.__importDefault(require("send"));
const resolve_dist_1 = require(process.argv[1]+"/../packages/resolve-dist");
const xhrs_1 = tslib_1.__importDefault(require("./controllers/xhrs"));
const runner_1 = require("./controllers/runner");
const iframes_1 = require("./controllers/iframes");
const data_context_1 = require(process.argv[1]+"/../packages/data-context");
const makeGraphQLServer_1 = require(process.argv[1]+"/../packages/graphql/src/makeGraphQLServer");
const body_parser_1 = tslib_1.__importDefault(require("body-parser"));
const path_1 = tslib_1.__importDefault(require("path"));
const app_data_1 = tslib_1.__importDefault(require("./util/app_data"));
const cache_buster_1 = tslib_1.__importDefault(require("./util/cache_buster"));
const spec_1 = tslib_1.__importDefault(require("./controllers/spec"));
const reporter_1 = tslib_1.__importDefault(require("./controllers/reporter"));
const client_1 = tslib_1.__importDefault(require("./controllers/client"));
const files_1 = tslib_1.__importDefault(require("./controllers/files"));
const plugins = tslib_1.__importStar(require("./plugins"));
const privileged_commands_manager_1 = require("./privileged-commands/privileged-commands-manager");
const debug = (0, debug_1.default)('cypress:server:routes');
const createCommonRoutes = ({ config, networkProxy, testingType, getSpec, remoteStates, nodeProxy, onError, }) => {
    const router = (0, express_1.Router)();
    const { clientRoute, namespace } = config;
    router.get(`/${config.namespace}/tests`, (req, res, next) => {
        // slice out the cache buster
        const test = cache_buster_1.default.strip(req.query.p);
        spec_1.default.handle(test, req, res, config, next, onError);
    });
    router.post(`/${config.namespace}/process-origin-callback`, body_parser_1.default.json(), async (req, res) => {
        try {
            const { file, fn, projectRoot } = req.body;
            debug('process origin callback: %s', fn);
            const contents = await plugins.execute('_process:cross:origin:callback', { file, fn, projectRoot });
            res.json({ contents });
        }
        catch (err) {
            const errorMessage = `Processing the origin callback errored:\n\n${err.stack}`;
            debug(errorMessage);
            res.json({
                error: errorMessage,
            });
        }
    });
    router.get(`/${config.namespace}/socket.io.js`, (req, res) => {
        client_1.default.handle(req, res);
    });
    router.get(`/${config.namespace}/reporter/*`, (req, res) => {
        reporter_1.default.handle(req, res);
    });
    router.get(`/${config.namespace}/automation/getLocalStorage`, (req, res) => {
        res.sendFile(path_1.default.join(__dirname, './html/get-local-storage.html'));
    });
    router.get(`/${config.namespace}/automation/setLocalStorage`, (req, res) => {
        const origin = req.originalUrl.slice(req.originalUrl.indexOf('?') + 1);
        networkProxy.http.getRenderedHTMLOrigins()[origin] = true;
        res.sendFile(path_1.default.join(__dirname, './html/set-local-storage.html'));
    });
    router.get(`/${config.namespace}/source-maps/:id.map`, (req, res) => {
        networkProxy.handleSourceMapRequest(req, res);
    });
    // special fallback - serve dist'd (bundled/static) files from the project path folder
    router.get(`/${config.namespace}/bundled/*`, (req, res) => {
        const file = app_data_1.default.getBundledFilePath(config.projectRoot, path_1.default.join('src', req.params[0]));
        debug(`Serving dist'd bundle at file path: %o`, { path: file, url: req.url });
        res.sendFile(file, { etag: false });
    });
    // TODO: The below route is not technically correct for cypress in cypress tests.
    // We should be using 'config.namespace' to provide the namespace instead of hard coding __cypress, however,
    // In the runner when we create the spec bridge we have no knowledge of the namespace used by the server so
    // we create a spec bridge for the namespace of the server specified in the config, but that server hasn't been created.
    // To fix this I think we need to find a way to listen in the cypress in cypress server for routes from the server the
    // cypress instance thinks should exist, but that's outside the current scope.
    router.get('/__cypress/spec-bridge-iframes', (req, res) => {
        debug('handling cross-origin iframe for domain: %s', req.hostname);
        // Chrome plans to make document.domain immutable in Chrome 109, with the default value
        // of the Origin-Agent-Cluster header becoming 'true'. We explicitly disable this header
        // in the spec-bridge-iframe to allow setting document.domain to the bare domain
        // to guarantee the spec bridge can communicate with the injected code.
        // @see https://github.com/cypress-io/cypress/issues/25010
        res.setHeader('Origin-Agent-Cluster', '?0');
        files_1.default.handleCrossOriginIframe(req, res, config);
    });
    router.post(`/${config.namespace}/add-verified-command`, body_parser_1.default.json(), (req, res) => {
        privileged_commands_manager_1.privilegedCommandsManager.addVerifiedCommand(req.body);
        res.sendStatus(204);
    });
    if (process.env.CYPRESS_INTERNAL_VITE_DEV) {
        const proxy = http_proxy_1.default.createProxyServer({
            target: `http://localhost:${process.env.CYPRESS_INTERNAL_VITE_APP_PORT}/`,
        });
        router.get('/__cypress/assets/*', (req, res) => {
            proxy.web(req, res, {}, (e) => { });
        });
    }
    else {
        router.get('/__cypress/assets/*', (req, res) => {
            const pathToFile = (0, resolve_dist_1.getPathToDist)('app', req.params[0]);
            return (0, send_1.default)(req, pathToFile).pipe(res);
        });
    }
    router.use(`/${namespace}/graphql/*`, makeGraphQLServer_1.graphQLHTTP);
    router.get(`/${namespace}/runner/*`, (req, res) => {
        runner_1.runner.handle(req, res);
    });
    router.all(`/${namespace}/xhrs/*`, (req, res, next) => {
        xhrs_1.default.handle(req, res, config, next);
    });
    router.get(`/${namespace}/iframes/*`, (req, res) => {
        if (testingType === 'e2e') {
            iframes_1.iframesController.e2e({ config, getSpec, remoteStates }, req, res);
        }
        if (testingType === 'component') {
            iframes_1.iframesController.component({ config, nodeProxy }, req, res);
        }
    });
    if (!clientRoute) {
        throw Error(`clientRoute is required. Received ${clientRoute}`);
    }
    router.get(clientRoute, (req, res) => {
        var _a, _b;
        const nonProxied = (_b = (_a = req.proxiedUrl) === null || _a === void 0 ? void 0 : _a.startsWith('/')) !== null && _b !== void 0 ? _b : false;
        (0, data_context_1.getCtx)().actions.app.setBrowserUserAgent(req.headers['user-agent']);
        // Chrome plans to make document.domain immutable in Chrome 109, with the default value
        // of the Origin-Agent-Cluster header becoming 'true'. We explicitly disable this header
        // so that we can continue to support tests that visit multiple subdomains in a single spec.
        // https://github.com/cypress-io/cypress/issues/20147
        res.setHeader('Origin-Agent-Cluster', '?0');
        (0, data_context_1.getCtx)().html.appHtml(nonProxied)
            .then((html) => res.send(html))
            .catch((e) => res.status(500).send({ stack: e.stack }));
    });
    // serve static assets from the dist'd Vite app
    router.get([
        `${clientRoute}assets/*`,
        `${clientRoute}shiki/*`,
    ], (req, res) => {
        debug('proxying static assets %s, params[0] %s', req.url, req.params[0]);
        const pathToFile = (0, resolve_dist_1.getPathToDist)('app', 'assets', req.params[0]);
        return (0, send_1.default)(req, pathToFile).pipe(res);
    });
    // user app code + spec code
    // default mounted to /__cypress/src/*
    // TODO: Remove this - only needed for Cy in Cy testing for unknown reasons.
    if (process.env.CYPRESS_INTERNAL_E2E_TESTING_SELF) {
        router.get(`${config.devServerPublicPathRoute}*`, (req, res) => {
            debug(`proxying to %s, originalUrl %s`, config.devServerPublicPathRoute, req.originalUrl);
            // user the node proxy here instead of the network proxy
            // to avoid the user accidentally intercepting and modifying
            // their own app.js files + spec.js files
            nodeProxy.web(req, res, {}, (e) => {
                if (e) {
                    // eslint-disable-next-line
                    debug('Proxy request error. This is likely the socket hangup issue, we can basically ignore this because the stream will automatically continue once the asset will be available', e);
                }
            });
        });
    }
    router.all('*', (req, res) => {
        networkProxy.handleHttpRequest(req, res);
    });
    // when we experience uncaught errors
    // during routing just log them out to
    // the console and send 500 status
    // and report to raygun (in production)
    const errorHandlingMiddleware = (err, req, res) => {
        console.log(err.stack); // eslint-disable-line no-console
        res.set('x-cypress-error', err.message);
        res.set('x-cypress-stack', JSON.stringify(err.stack));
        res.sendStatus(500);
    };
    router.use(errorHandlingMiddleware);
    return router;
};
exports.createCommonRoutes = createCommonRoutes;
