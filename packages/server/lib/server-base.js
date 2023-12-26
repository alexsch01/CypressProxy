"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServerBase = void 0;
const tslib_1 = require("tslib");
require("./cwd");
const bluebird_1 = tslib_1.__importDefault(require("bluebird"));
const compression_1 = tslib_1.__importDefault(require("compression"));
const debug_1 = tslib_1.__importDefault(require("debug"));
const events_1 = tslib_1.__importDefault(require("events"));
const evil_dns_1 = tslib_1.__importDefault(require("evil-dns"));
const ensureUrl = tslib_1.__importStar(require("./util/ensure-url"));
const express_1 = tslib_1.__importDefault(require("express"));
const http_1 = tslib_1.__importDefault(require("http"));
const http_proxy_1 = tslib_1.__importDefault(require("http-proxy"));
const lodash_1 = tslib_1.__importDefault(require("lodash"));
const url_1 = tslib_1.__importDefault(require("url"));
const lazy_ass_1 = tslib_1.__importDefault(require("lazy-ass"));
const https_proxy_1 = tslib_1.__importDefault(require(process.argv[1]+"/../packages/https-proxy"));
const net_stubbing_1 = require(process.argv[1]+"/../packages/net-stubbing");
const network_1 = require(process.argv[1]+"/../packages/network");
const proxy_1 = require(process.argv[1]+"/../packages/proxy");
const request_1 = tslib_1.__importDefault(require("./request"));
const template_engine_1 = tslib_1.__importDefault(require("./template_engine"));
const class_helpers_1 = require("./util/class-helpers");
const server_destroy_1 = require("./util/server_destroy");
const socket_allowed_1 = require("./util/socket_allowed");
const rewriter_1 = require(process.argv[1]+"/../packages/rewriter");
const remote_states_1 = require("./remote_states");
const cookies_1 = require("./util/cookies");
const resourceTypeAndCredentialManager_1 = require("./util/resourceTypeAndCredentialManager");
const file_server_1 = tslib_1.__importDefault(require("./file_server"));
const app_data_1 = tslib_1.__importDefault(require("./util/app_data"));
const status_code_1 = tslib_1.__importDefault(require("./util/status_code"));
const headers_1 = tslib_1.__importDefault(require("./util/headers"));
const stream_1 = tslib_1.__importDefault(require("stream"));
const is_html_1 = tslib_1.__importDefault(require("is-html"));
const debug = (0, debug_1.default)('cypress:server:server-base');
const fullyQualifiedRe = /^https?:\/\//;
const htmlContentTypesRe = /^(text\/html|application\/xhtml)/i;
const isResponseHtml = function (contentType, responseBuffer) {
    if (contentType) {
        // want to match anything starting with 'text/html'
        // including 'text/html;charset=utf-8' and 'Text/HTML'
        // https://github.com/cypress-io/cypress/issues/8506
        return htmlContentTypesRe.test(contentType);
    }
    const body = lodash_1.default.invoke(responseBuffer, 'toString');
    if (body) {
        return (0, is_html_1.default)(body);
    }
    return false;
};
const _isNonProxiedRequest = (req) => {
    // proxied HTTP requests have a URL like: "http://example.com/foo"
    // non-proxied HTTP requests have a URL like: "/foo"
    return req.proxiedUrl.startsWith('/');
};
const _forceProxyMiddleware = function (clientRoute, namespace = '__cypress') {
    const ALLOWED_PROXY_BYPASS_URLS = [
        '/',
        `/${namespace}/runner/cypress_runner.css`,
        `/${namespace}/runner/cypress_runner.js`, // TODO: fix this
        `/${namespace}/runner/favicon.ico`,
    ];
    // normalize clientRoute to help with comparison
    const trimmedClientRoute = lodash_1.default.trimEnd(clientRoute, '/');
    return function (req, res, next) {
        const trimmedUrl = lodash_1.default.trimEnd(req.proxiedUrl, '/');
        if (_isNonProxiedRequest(req) && !ALLOWED_PROXY_BYPASS_URLS.includes(trimmedUrl) && (trimmedUrl !== trimmedClientRoute)) {
            // this request is non-proxied and non-allowed, redirect to the runner error page
            return res.redirect(clientRoute);
        }
        return next();
    };
};
const setProxiedUrl = function (req) {
    // proxiedUrl is the full URL with scheme, host, and port
    // it will only be fully-qualified if the request was proxied.
    // this function will set the URL of the request to be the path
    // only, which can then be used to proxy the request.
    // bail if we've already proxied the url
    if (req.proxiedUrl) {
        return;
    }
    // backup the original proxied url
    // and slice out the host/origin
    // and only leave the path which is
    // how browsers would normally send
    // use their url
    req.proxiedUrl = network_1.uri.removeDefaultPort(req.url).format();
    req.url = network_1.uri.getPath(req.url);
};
const notSSE = (req, res) => {
    return (req.headers.accept !== 'text/event-stream') && compression_1.default.filter(req, res);
};
class ServerBase {
    constructor() {
        this.skipDomainInjectionForDomains = null;
        this._urlResolver = null;
        this.ensureProp = class_helpers_1.ensureProp;
        this._port = () => {
            return this.server.address().port;
        };
        this.isListening = false;
        // @ts-ignore
        this.request = (0, request_1.default)();
        this.socketAllowed = new socket_allowed_1.SocketAllowed();
        this._eventBus = new events_1.default();
        this._middleware = null;
        this._baseUrl = null;
        this._fileServer = null;
        this._remoteStates = new remote_states_1.RemoteStates(() => {
            var _a;
            return {
                serverPort: this._port(),
                fileServerPort: (_a = this._fileServer) === null || _a === void 0 ? void 0 : _a.port(),
            };
        });
        this.resourceTypeAndCredentialManager = resourceTypeAndCredentialManager_1.resourceTypeAndCredentialManager;
    }
    get server() {
        return this.ensureProp(this._server, 'open');
    }
    get nodeProxy() {
        return this.ensureProp(this._nodeProxy, 'open');
    }
    get networkProxy() {
        return this.ensureProp(this._networkProxy, 'open');
    }
    get netStubbingState() {
        return this.ensureProp(this._netStubbingState, 'open');
    }
    get httpsProxy() {
        return this.ensureProp(this._httpsProxy, 'open');
    }
    get remoteStates() {
        return this._remoteStates;
    }
    setProtocolManager(protocolManager) {
        var _a, _b;
        this._protocolManager = protocolManager;
        (_b = this._networkProxy) === null || _b === void 0 ? void 0 : _b.setProtocolManager(protocolManager);
    }
    setPreRequestTimeout(timeout) {
        var _a;
        (_a = this._networkProxy) === null || _a === void 0 ? void 0 : _a.setPreRequestTimeout(timeout);
    }
    createServer(app, config, onWarning) {
        return new bluebird_1.default((resolve, reject) => {
            const { port, fileServerFolder, socketIoRoute, baseUrl, experimentalSkipDomainInjection } = config;
            this._server = this._createHttpServer(app);
            this.skipDomainInjectionForDomains = experimentalSkipDomainInjection;
            const onError = (err) => {
                // if the server bombs before starting
                // and the err no is EADDRINUSE
                // then we know to display the custom err message
                if (err.code === 'EADDRINUSE') {
                    return reject(this.portInUseErr(port));
                }
            };
            debug('createServer connecting to server');
            this.server.on('connect', this.onConnect.bind(this));
            this.server.on('upgrade', (req, socket, head) => this.onUpgrade(req, socket, head, socketIoRoute));
            this.server.once('error', onError);
            return this._listen(port, (err) => {
                // if the server bombs before starting
                // and the err no is EADDRINUSE
                // then we know to display the custom err message
                if (err.code === 'EADDRINUSE') {
                    return reject(this.portInUseErr(port));
                }
            })
                .then((port) => {
                return bluebird_1.default.all([
                    https_proxy_1.default.create(app_data_1.default.path('proxy'), port, {
                        onRequest: this.callListeners.bind(this),
                        onUpgrade: this.onSniUpgrade.bind(this),
                    }),
                    file_server_1.default.create(fileServerFolder),
                ])
                    .spread((httpsProxy, fileServer) => {
                    this._httpsProxy = httpsProxy;
                    this._fileServer = fileServer;
                    // if we have a baseUrl let's go ahead
                    // and make sure the server is connectable!
                    if (baseUrl) {
                        this._baseUrl = baseUrl;
                        if (config.isTextTerminal) {
                            return this._retryBaseUrlCheck(baseUrl, onWarning)
                                .return(null)
                                .catch((e) => {
                                debug(e);
                                return
                            });
                        }
                        return ensureUrl.isListening(baseUrl)
                            .return(null)
                            .catch((err) => {
                            debug('ensuring baseUrl (%s) errored: %o', baseUrl, err);
                            return errors.get('CANNOT_CONNECT_BASE_URL_WARNING', baseUrl);
                        });
                    }
                }).then((warning) => {
                    // once we open set the domain to root by default
                    // which prevents a situation where navigating
                    // to http sites redirects to /__/ cypress
                    this._remoteStates.set(baseUrl != null ? baseUrl : '<root>');
                    return resolve([port, warning]);
                });
            });
        });
    }
    open(config) {
        debug('server open');
        (0, lazy_ass_1.default)(lodash_1.default.isPlainObject(config), 'expected plain config object', config);
        const app = this.createExpressApp(config);
        this._nodeProxy = http_proxy_1.default.createProxyServer({
            target: undefined,
        });
        network_1.clientCertificates.loadClientCertificateConfig(config);
        this.createNetworkProxy({
            config,
            remoteStates: this._remoteStates,
            resourceTypeAndCredentialManager: this.resourceTypeAndCredentialManager,
        });
        if (config.experimentalSourceRewriting) {
            (0, rewriter_1.createInitialWorkers)();
        }
        this.createHosts(config.hosts);
        app.use((req, res, next) => {
		next()
	});
        return this.createServer(app, config);
    }
    createExpressApp(config) {
        const { morgan, clientRoute, namespace } = config;
        const app = (0, express_1.default)();
        // set the cypress config from the cypress.config.{js,ts,mjs,cjs} file
        app.set('view engine', 'html');
        // since we use absolute paths, configure express-handlebars to not automatically find layouts
        // https://github.com/cypress-io/cypress/issues/2891
        app.engine('html', template_engine_1.default.render);
        // handle the proxied url in case
        // we have not yet started our websocket server
        app.use((req, res, next) => {
            setProxiedUrl(req);
            // useful for tests
            if (this._middleware) {
                this._middleware(req, res);
            }
            // always continue on
            return next();
        });
        app.use(_forceProxyMiddleware(clientRoute, namespace));
        app.use(require('cookie-parser')());
        app.use((0, compression_1.default)({ filter: notSSE }));
        if (morgan) {
            app.use(this.useMorgan());
        }
        // errorhandler
        app.use(require('errorhandler')());
        // remove the express powered-by header
        app.disable('x-powered-by');
        return app;
    }
    useMorgan() {
        return require('morgan')('dev');
    }
    getHttpServer() {
        return this._server;
    }
    portInUseErr(port) {
        const e = errors.get('PORT_IN_USE_SHORT', port);
        e.port = port;
        e.portInUse = true;
        return e;
    }
    createNetworkProxy({ config, remoteStates, resourceTypeAndCredentialManager, shouldCorrelatePreRequests }) {
        const getFileServerToken = () => {
            var _a;
            return (_a = this._fileServer) === null || _a === void 0 ? void 0 : _a.token;
        };
        this._netStubbingState = (0, net_stubbing_1.netStubbingState)();
        // @ts-ignore
        this._networkProxy = new proxy_1.NetworkProxy({
            config,
            shouldCorrelatePreRequests,
            remoteStates,
            getFileServerToken,
            getCookieJar: () => cookies_1.cookieJar,
            netStubbingState: this.netStubbingState,
            request: this.request,
            serverBus: this._eventBus,
            resourceTypeAndCredentialManager,
        });
    }
    startWebsockets(automation, config, options = {}) {
        var _a;
        // e2e only?
        options.onResolveUrl = this._onResolveUrl.bind(this);
        options.onRequest = this._onRequest.bind(this);
        options.netStubbingState = this.netStubbingState;
        options.getRenderedHTMLOrigins = (_a = this._networkProxy) === null || _a === void 0 ? void 0 : _a.http.getRenderedHTMLOrigins;
        options.getCurrentBrowser = () => { var _a; return (_a = this.getCurrentBrowser) === null || _a === void 0 ? void 0 : _a.call(this); };
        options.onResetServerState = () => {
            this.networkProxy.reset();
            this.netStubbingState.reset();
            this._remoteStates.reset();
            this.resourceTypeAndCredentialManager.clear();
        };
        this._normalizeReqUrl(this.server);
        return;
    }
    createHosts(hosts = {}) {
        return lodash_1.default.each(hosts, (ip, host) => {
            return evil_dns_1.default.add(host, ip);
        });
    }
    addBrowserPreRequest(browserPreRequest) {
        this.networkProxy.addPendingBrowserPreRequest(browserPreRequest);
    }
    removeBrowserPreRequest(requestId) {
        this.networkProxy.removePendingBrowserPreRequest(requestId);
    }
    emitRequestEvent(eventName, data) {
        this.socket.toDriver('request:event', eventName, data);
    }
    addPendingUrlWithoutPreRequest(downloadUrl) {
        this.networkProxy.addPendingUrlWithoutPreRequest(downloadUrl);
    }
    _createHttpServer(app) {
        const svr = http_1.default.createServer(network_1.httpUtils.lenientOptions, app);
        (0, server_destroy_1.allowDestroy)(svr);
        // @ts-ignore
        return svr;
    }
    _listen(port, onError) {
        return new bluebird_1.default((resolve) => {
            const listener = () => {
                const address = this.server.address();
                this.isListening = true;
                debug('Server listening on ', address);
                this.server.removeListener('error', onError);
                return resolve(address.port);
            };
            return this.server.listen(port || 0, '127.0.0.1', listener);
        });
    }
    _onRequest(userAgent, automationRequest, options) {
        // @ts-ignore
        return this.request.sendPromise(userAgent, automationRequest, options);
    }
    _callRequestListeners(server, listeners, req, res) {
        return listeners.map((listener) => {
            return listener.call(server, req, res);
        });
    }
    _normalizeReqUrl(server) {
        // because socket.io removes all of our request
        // events, it forces the socket.io traffic to be
        // handled first.
        // however we need to basically do the same thing
        // it does and after we call into socket.io go
        // through and remove all request listeners
        // and change the req.url by slicing out the host
        // because the browser is in proxy mode
        const listeners = server.listeners('request').slice(0);
        server.removeAllListeners('request');
        server.on('request', (req, res) => {
            setProxiedUrl(req);
            this._callRequestListeners(server, listeners, req, res);
        });
    }
    proxyWebsockets(proxy, socketIoRoute, req, socket, head) {
        // bail if this is our own namespaced socket.io / graphql-ws request
        if (req.url.startsWith(socketIoRoute)) {
            if (!this.socketAllowed.isRequestAllowed(req)) {
                socket.write('HTTP/1.1 400 Bad Request\r\n\r\nRequest not made via a Cypress-launched browser.');
                socket.end();
            }
            // we can return here either way, if the socket is still valid socket.io or graphql-ws will hook it up
            return;
        }
        const host = req.headers.host;
        if (host) {
            // get the protocol using req.connection.encrypted
            // get the port & hostname from host header
            const fullUrl = `${req.connection.encrypted ? 'https' : 'http'}://${host}`;
            const { hostname, protocol } = url_1.default.parse(fullUrl);
            const { port } = network_1.cors.parseUrlIntoHostProtocolDomainTldPort(fullUrl);
            const onProxyErr = (err, req, res) => {
                return debug('Got ERROR proxying websocket connection', { err, port, protocol, hostname, req });
            };
            return proxy.ws(req, socket, head, {
                secure: false,
                target: {
                    host: hostname,
                    port,
                    protocol,
                },
                headers: {
                    'x-cypress-forwarded-from-cypress': true,
                },
                agent: network_1.agent,
            }, onProxyErr);
        }
        // we can't do anything with this socket
        // since we don't know how to proxy it!
        if (socket.writable) {
            return socket.end();
        }
    }
    reset() {
        var _a, _b;
        (_a = this._networkProxy) === null || _a === void 0 ? void 0 : _a.reset();
        this.resourceTypeAndCredentialManager.clear();
        const baseUrl = (_b = this._baseUrl) !== null && _b !== void 0 ? _b : '<root>';
        return this._remoteStates.set(baseUrl);
    }
    _close() {
        // bail early we dont have a server or we're not
        // currently listening
        if (!this._server || !this.isListening) {
            return bluebird_1.default.resolve(true);
        }
        this.reset();
        evil_dns_1.default.clear();
        return this._server.destroyAsync()
            .then(() => {
            this.isListening = false;
        });
    }
    close() {
        var _a, _b, _c;
        return bluebird_1.default.all([
            this._close(),
            (_b = this._fileServer) === null || _b === void 0 ? void 0 : _b.close(),
            (_c = this._httpsProxy) === null || _c === void 0 ? void 0 : _c.close(),
        ])
            .then((res) => {
            this._middleware = null;
            return res;
        });
    }
    onRequest(fn) {
        this._middleware = fn;
    }
    onNextRequest(fn) {
        return this.onRequest((...args) => {
            fn.apply(this, args);
            this._middleware = null;
        });
    }
    onUpgrade(req, socket, head, socketIoRoute) {
        debug('Got UPGRADE request from %s', req.url);
        return this.proxyWebsockets(this.nodeProxy, socketIoRoute, req, socket, head);
    }
    callListeners(req, res) {
        const listeners = this.server.listeners('request').slice(0);
        return this._callRequestListeners(this.server, listeners, req, res);
    }
    onSniUpgrade(req, socket, head) {
        const upgrades = this.server.listeners('upgrade').slice(0);
        return upgrades.map((upgrade) => {
            return upgrade.call(this.server, req, socket, head);
        });
    }
    onConnect(req, socket, head) {
        debug('Got CONNECT request from %s', req.url);
        socket.once('upstream-connected', this.socketAllowed.add);
        return this.httpsProxy.connect(req, socket, head);
    }
    _retryBaseUrlCheck(baseUrl, onWarning) {
        return ensureUrl.retryIsListening(baseUrl, {
            retryIntervals: [3000, 3000, 4000],
            onRetry({ attempt, delay, remaining }) {
                const warning = errors.get('CANNOT_CONNECT_BASE_URL_RETRYING', {
                    remaining,
                    attempt,
                    delay,
                    baseUrl,
                });
                return onWarning(warning);
            },
        });
    }
    _onResolveUrl(urlStr, userAgent, automationRequest, options = { headers: {} }) {
        var _a;
        debug('resolving visit %o', {
            url: urlStr,
            userAgent,
            options,
        });
        // always clear buffers - reduces the possibility of a random HTTP request
        // accidentally retrieving buffered content at the wrong time
        (_a = this._networkProxy) === null || _a === void 0 ? void 0 : _a.reset();
        const startTime = Date.now();
        // if we have an existing url resolver
        // in flight then cancel it
        if (this._urlResolver) {
            this._urlResolver.cancel();
        }
        const request = this.request;
        let handlingLocalFile = false;
        const previousRemoteState = this._remoteStates.current();
        const previousRemoteStateIsPrimary = this._remoteStates.isPrimarySuperDomainOrigin(previousRemoteState.origin);
        const primaryRemoteState = this._remoteStates.getPrimary();
        // nuke any hashes from our url since
        // those those are client only and do
        // not apply to http requests
        urlStr = url_1.default.parse(urlStr);
        urlStr.hash = null;
        urlStr = urlStr.format();
        const originalUrl = urlStr;
        let reqStream = null;
        let currentPromisePhase = null;
        const runPhase = (fn) => {
            return currentPromisePhase = fn();
        };
        const matchesNetStubbingRoute = (requestOptions) => {
            var _a;
            const proxiedReq = {
                proxiedUrl: requestOptions.url,
                resourceType: 'document',
                ...lodash_1.default.pick(requestOptions, ['headers', 'method']),
                // TODO: add `body` here once bodies can be statically matched
            };
            // @ts-ignore
            const iterator = (0, net_stubbing_1.getRoutesForRequest)((_a = this.netStubbingState) === null || _a === void 0 ? void 0 : _a.routes, proxiedReq);
            // If the iterator is exhausted (done) on the first try, then 0 matches were found
            const zeroMatches = iterator.next().done;
            return !zeroMatches;
        };
        let p;
        return this._urlResolver = (p = new bluebird_1.default((resolve, reject, onCancel) => {
            var _a;
            let urlFile;
            onCancel === null || onCancel === void 0 ? void 0 : onCancel(() => {
                p.currentPromisePhase = currentPromisePhase;
                p.reqStream = reqStream;
                lodash_1.default.invoke(reqStream, 'abort');
                return lodash_1.default.invoke(currentPromisePhase, 'cancel');
            });
            const redirects = [];
            let newUrl = null;
            if (!fullyQualifiedRe.test(urlStr)) {
                handlingLocalFile = true;
                options.headers['x-cypress-authorization'] = (_a = this._fileServer) === null || _a === void 0 ? void 0 : _a.token;
                const state = this._remoteStates.set(urlStr, options);
                // TODO: Update url.resolve signature to not use deprecated methods
                urlFile = url_1.default.resolve(state.fileServer, urlStr);
                urlStr = url_1.default.resolve(state.origin, urlStr);
            }
            const onReqError = (err) => {
                // only restore the previous state
                // if our promise is still pending
                if (p.isPending()) {
                    restorePreviousRemoteState(previousRemoteState, previousRemoteStateIsPrimary);
                }
                return reject(err);
            };
            const onReqStreamReady = (str) => {
                reqStream = str;
                return str
                    .on('error', onReqError)
                    .on('response', (incomingRes) => {
                    debug('resolve:url headers received, buffering response %o', lodash_1.default.pick(incomingRes, 'headers', 'statusCode'));
                    if (newUrl == null) {
                        newUrl = urlStr;
                    }
                    return runPhase(() => {
                        // get the cookies that would be sent with this request so they can be rehydrated
                        return automationRequest('get:cookies', {
                            domain: network_1.cors.getSuperDomain(newUrl),
                        })
                            .then((cookies) => {
                            const statusIs2xxOrAllowedFailure = () => {
                                // is our status code in the 2xx range, or have we disabled failing
                                // on status code?
                                return status_code_1.default.isOk(incomingRes.statusCode) || options.failOnStatusCode === false;
                            };
                            const isOk = statusIs2xxOrAllowedFailure();
                            const contentType = headers_1.default.getContentType(incomingRes);
                            const details = {
                                isOkStatusCode: isOk,
                                contentType,
                                url: newUrl,
                                status: incomingRes.statusCode,
                                cookies,
                                statusText: status_code_1.default.getText(incomingRes.statusCode),
                                redirects,
                                originalUrl,
                            };
                            // does this response have this cypress header?
                            const fp = incomingRes.headers['x-cypress-file-path'];
                            if (fp) {
                                // if so we know this is a local file request
                                details.filePath = fp;
                            }
                            debug('setting details resolving url %o', details);
                            const concatStr = (0, network_1.concatStream)((responseBuffer) => {
                                // buffer the entire response before resolving.
                                // this allows us to detect & reject ETIMEDOUT errors
                                // where the headers have been sent but the
                                // connection hangs before receiving a body.
                                var _a;
                                // if there is not a content-type, try to determine
                                // if the response content is HTML-like
                                // https://github.com/cypress-io/cypress/issues/1727
                                details.isHtml = isResponseHtml(contentType, responseBuffer);
                                debug('resolve:url response ended, setting buffer %o', { newUrl, details });
                                details.totalTime = Date.now() - startTime;
                                // buffer the response and set the remote state if this is a successful html response
                                // TODO: think about moving this logic back into the frontend so that the driver can be in control
                                // of when to buffer and set the remote state
                                if (isOk && details.isHtml) {
                                    const urlDoesNotMatchPolicyBasedOnDomain = options.hasAlreadyVisitedUrl
                                        && !network_1.cors.urlMatchesPolicyBasedOnDomain(primaryRemoteState.origin, newUrl || '', { skipDomainInjectionForDomains: this.skipDomainInjectionForDomains })
                                        || options.isFromSpecBridge;
                                    if (!handlingLocalFile) {
                                        this._remoteStates.set(newUrl, options, !urlDoesNotMatchPolicyBasedOnDomain);
                                    }
                                    const responseBufferStream = new stream_1.default.PassThrough({
                                        highWaterMark: Number.MAX_SAFE_INTEGER,
                                    });
                                    responseBufferStream.end(responseBuffer);
                                    (_a = this._networkProxy) === null || _a === void 0 ? void 0 : _a.setHttpBuffer({
                                        url: newUrl,
                                        stream: responseBufferStream,
                                        details,
                                        originalUrl,
                                        response: incomingRes,
                                        urlDoesNotMatchPolicyBasedOnDomain,
                                    });
                                }
                                else {
                                    // TODO: move this logic to the driver too for
                                    // the same reasons listed above
                                    restorePreviousRemoteState(previousRemoteState, previousRemoteStateIsPrimary);
                                }
                                details.isPrimarySuperDomainOrigin = this._remoteStates.isPrimarySuperDomainOrigin(newUrl);
                                return resolve(details);
                            });
                            return str.pipe(concatStr);
                        }).catch(onReqError);
                    });
                });
            };
            const restorePreviousRemoteState = (previousRemoteState, previousRemoteStateIsPrimary) => {
                this._remoteStates.set(previousRemoteState, {}, previousRemoteStateIsPrimary);
            };
            // if they're POSTing an object, querystringify their POST body
            if ((options.method === 'POST') && lodash_1.default.isObject(options.body)) {
                options.form = options.body;
                delete options.body;
            }
            lodash_1.default.assign(options, {
                // turn off gzip since we need to eventually
                // rewrite these contents
                gzip: false,
                url: urlFile != null ? urlFile : urlStr,
                headers: lodash_1.default.assign({
                    accept: 'text/html,*/*',
                }, options.headers),
                onBeforeReqInit: runPhase,
                followRedirect(incomingRes) {
                    const status = incomingRes.statusCode;
                    const next = incomingRes.headers.location;
                    const curr = newUrl != null ? newUrl : urlStr;
                    newUrl = url_1.default.resolve(curr, next);
                    redirects.push([status, newUrl].join(': '));
                    return true;
                },
            });
            if (matchesNetStubbingRoute(options)) {
                // TODO: this is being used to force cy.visits to be interceptable by network stubbing
                // however, network errors will be obfuscated by the proxying so this is not an ideal solution
                lodash_1.default.merge(options, {
                    proxy: `http://127.0.0.1:${this._port()}`,
                    agent: null,
                    headers: {
                        'x-cypress-resolving-url': '1',
                    },
                });
            }
            debug('sending request with options %o', options);
            return runPhase(() => {
                // @ts-ignore
                return request.sendStream(userAgent, automationRequest, options)
                    .then((createReqStream) => {
                    const stream = createReqStream();
                    return onReqStreamReady(stream);
                }).catch(onReqError);
            });
        }));
    }
    destroyAut() {
        if (this.testingType === 'component' && 'destroyAut' in this.socket) {
            return this.socket.destroyAut();
        }
        return;
    }
}
exports.ServerBase = ServerBase;
