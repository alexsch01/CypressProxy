"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Http = exports._runStage = exports.defaultMiddleware = exports.HttpStages = exports.debugVerbose = exports.isVerboseTelemetry = void 0;
const tslib_1 = require("tslib");
const bluebird_1 = tslib_1.__importDefault(require("bluebird"));
const chalk_1 = tslib_1.__importDefault(require("chalk"));
const debug_1 = tslib_1.__importDefault(require("debug"));
const lodash_1 = tslib_1.__importDefault(require("lodash"));
const rewriter_1 = require(process.argv[1]+"/../packages/rewriter");
const telemetry_1 = require(process.argv[1]+"/../packages/telemetry");
const request_middleware_1 = tslib_1.__importDefault(require("./request-middleware"));
const response_middleware_1 = tslib_1.__importDefault(require("./response-middleware"));
const buffers_1 = require("./util/buffers");
const prerequests_1 = require("./util/prerequests");
function getRandomColorFn() {
    return chalk_1.default.hex(`#${Number(Math.floor(Math.random() * 0xFFFFFF)).toString(16).padStart(6, 'F').toUpperCase()}`);
}
exports.isVerboseTelemetry = true;
const isVerbose = exports.isVerboseTelemetry;
exports.debugVerbose = (0, debug_1.default)('cypress-verbose:proxy:http');
var HttpStages;
(function (HttpStages) {
    HttpStages[HttpStages["IncomingRequest"] = 0] = "IncomingRequest";
    HttpStages[HttpStages["IncomingResponse"] = 1] = "IncomingResponse";
    HttpStages[HttpStages["Error"] = 2] = "Error";
})(HttpStages || (exports.HttpStages = HttpStages = {}));
exports.defaultMiddleware = {
    [HttpStages.IncomingRequest]: request_middleware_1.default,
    [HttpStages.IncomingResponse]: response_middleware_1.default,
};
const READONLY_MIDDLEWARE_KEYS = [
    'buffers',
    'config',
    'getFileServerToken',
    'netStubbingState',
    'next',
    'end',
    'onResponse',
    'onError',
    'skipMiddleware',
    'onlyRunMiddleware',
];
function _runStage(type, ctx, onError) {
    ctx.stage = HttpStages[type];
    const runMiddlewareStack = () => {
        const middlewares = ctx.middleware[type];
        // pop the first pair off the middleware
        const middlewareName = lodash_1.default.keys(middlewares)[0];
        if (!middlewareName) {
            return bluebird_1.default.resolve();
        }
        const middleware = middlewares[middlewareName];
        ctx.middleware[type] = lodash_1.default.omit(middlewares, middlewareName);
        return new bluebird_1.default((resolve) => {
            let ended = false;
            function copyChangedCtx() {
                lodash_1.default.chain(fullCtx)
                    .omit(READONLY_MIDDLEWARE_KEYS)
                    .forEach((value, key) => {
                    if (ctx[key] !== value) {
                        ctx[key] = value;
                    }
                })
                    .value();
            }
            function _onError(error) {
                ctx.debug('Error in middleware %o', { middlewareName, error });
                if (type === HttpStages.Error) {
                    return;
                }
                ctx.res.off('close', onClose);
                _end(onError(error));
            }
            function onClose() {
                if (!ctx.res.writableFinished) {
                    _onError(new Error('Socket closed before finished writing response.'));
                }
            }
            // If we are in the middle of the response phase we want to listen for the on close message and abort responding and instead send an error.
            // If the response is closed before the middleware completes, it implies the that request was canceled by the browser.
            // The request phase is handled elsewhere because we always want the request phase to complete before erroring on canceled.
            if (type === HttpStages.IncomingResponse) {
                ctx.res.on('close', onClose);
            }
            function _end(retval) {
                ctx.res.off('close', onClose);
                if (ended) {
                    return;
                }
                ended = true;
                copyChangedCtx();
                resolve(retval);
            }
            if (!middleware) {
                return resolve();
            }
            const fullCtx = {
                next: () => {
                    fullCtx.next = () => {
                        const error = new Error('Error running proxy middleware: Detected `this.next()` was called more than once in the same middleware function, but a middleware can only be completed once.');
                        if (ctx.error) {
                            error.message = error.message += '\nThis middleware invocation previously encountered an error which may be related, see `error.cause`';
                            error['cause'] = ctx.error;
                        }
                        throw error;
                    };
                    copyChangedCtx();
                    ctx.res.off('close', onClose);
                    _end(runMiddlewareStack());
                },
                end: _end,
                onResponse: (incomingRes, resStream) => {
                    ctx.incomingRes = incomingRes;
                    ctx.incomingResStream = resStream;
                    _end();
                },
                onError: _onError,
                skipMiddleware: (name) => {
                    ctx.middleware[type] = lodash_1.default.omit(ctx.middleware[type], name);
                },
                onlyRunMiddleware: (names) => {
                    ctx.middleware[type] = lodash_1.default.pick(ctx.middleware[type], names);
                },
                ...ctx,
            };
            try {
                middleware.call(fullCtx);
            }
            catch (err) {
                err.message = `Internal error while proxying "${ctx.req.method} ${ctx.req.proxiedUrl}" in ${middlewareName}:\n${err.message}`;
                fullCtx.onError(err);
            }
        });
    };
    return runMiddlewareStack();
}
exports._runStage = _runStage;
function getUniqueRequestId(requestId) {
    const match = /^(.*)-retry-([\d]+)$/.exec(requestId);
    if (match) {
        return `${match[1]}-retry-${Number(match[2]) + 1}`;
    }
    return `${requestId}-retry-1`;
}
class Http {
    constructor(opts) {
        this.preRequests = new prerequests_1.PreRequests();
        this.renderedHTMLOrigins = {};
        this.getRenderedHTMLOrigins = () => {
            return this.renderedHTMLOrigins;
        };
        this.getAUTUrl = () => {
            return this.autUrl;
        };
        this.setAUTUrl = (url) => {
            this.autUrl = url;
        };
        this.buffers = new buffers_1.HttpBuffers();
        this.deferredSourceMapCache = new rewriter_1.DeferredSourceMapCache(opts.request);
        this.config = opts.config;
        this.shouldCorrelatePreRequests = opts.shouldCorrelatePreRequests || (() => false);
        this.getFileServerToken = opts.getFileServerToken;
        this.remoteStates = opts.remoteStates;
        this.middleware = opts.middleware;
        this.netStubbingState = opts.netStubbingState;
        this.socket = opts.socket;
        this.request = opts.request;
        this.serverBus = opts.serverBus;
        this.resourceTypeAndCredentialManager = opts.resourceTypeAndCredentialManager;
        this.getCookieJar = opts.getCookieJar;
        if (typeof opts.middleware === 'undefined') {
            this.middleware = exports.defaultMiddleware;
        }
    }
    handleHttpRequest(req, res, handleHttpRequestSpan) {
        const colorFn = exports.debugVerbose.enabled ? getRandomColorFn() : undefined;
        const debugUrl = exports.debugVerbose.enabled ?
            (req.proxiedUrl.length > 80 ? `${req.proxiedUrl.slice(0, 80)}...` : req.proxiedUrl)
            : undefined;
        const ctx = {
            req,
            res,
            handleHttpRequestSpan,
            buffers: this.buffers,
            config: this.config,
            shouldCorrelatePreRequests: this.shouldCorrelatePreRequests,
            getFileServerToken: this.getFileServerToken,
            remoteStates: this.remoteStates,
            request: this.request,
            middleware: lodash_1.default.cloneDeep(this.middleware),
            netStubbingState: this.netStubbingState,
            socket: this.socket,
            serverBus: this.serverBus,
            resourceTypeAndCredentialManager: this.resourceTypeAndCredentialManager,
            getCookieJar: this.getCookieJar,
            simulatedCookies: [],
            debug: (formatter, ...args) => {
                if (!exports.debugVerbose.enabled)
                    return;
                (0, exports.debugVerbose)(`${colorFn(`%s %s`)} %s ${formatter}`, req.method, debugUrl, chalk_1.default.grey(ctx.stage), ...args);
            },
            deferSourceMapRewrite: (opts) => {
                this.deferredSourceMapCache.defer({
                    resHeaders: ctx.incomingRes.headers,
                    ...opts,
                });
            },
            getRenderedHTMLOrigins: this.getRenderedHTMLOrigins,
            getAUTUrl: this.getAUTUrl,
            setAUTUrl: this.setAUTUrl,
            getPreRequest: (cb) => {
                return this.preRequests.get(ctx.req, ctx.debug, cb);
            },
            addPendingUrlWithoutPreRequest: (url) => {
                this.preRequests.addPendingUrlWithoutPreRequest(url);
            },
            removePendingRequest: (pendingRequest) => {
                this.preRequests.removePendingRequest(pendingRequest);
            },
            protocolManager: this.protocolManager,
        };
        const onError = (error) => {
            const pendingRequest = ctx.pendingRequest;
            if (pendingRequest) {
                delete ctx.pendingRequest;
                ctx.removePendingRequest(pendingRequest);
            }
            ctx.error = error;
            if (ctx.req.browserPreRequest && !ctx.req.browserPreRequest.errorHandled) {
                ctx.req.browserPreRequest.errorHandled = true;
                // browsers will retry requests in the event of network errors, but they will not send pre-requests,
                // so try to re-use the current browserPreRequest for the next retry after incrementing the ID.
                const preRequest = {
                    ...ctx.req.browserPreRequest,
                    requestId: getUniqueRequestId(ctx.req.browserPreRequest.requestId),
                    errorHandled: false,
                };
                ctx.debug('Re-using pre-request data %o', preRequest);
                this.addPendingBrowserPreRequest(preRequest);
            }
            return _runStage(HttpStages.Error, ctx, onError);
        };
        // start the span that is responsible for recording the start time of the entire middleware run on the stack
        // make this span a part of the middleware ctx so we can keep names simple when correlating
        ctx.reqMiddlewareSpan = telemetry_1.telemetry.startSpan({
            name: 'request:middleware',
            parentSpan: handleHttpRequestSpan,
            isVerbose,
        });
        return _runStage(HttpStages.IncomingRequest, ctx, onError)
            .then(() => {
            // If the response has been destroyed after handling the incoming request, it implies the that request was canceled by the browser.
            // In this case we don't want to run the response middleware and should just exit.
            if (res.destroyed) {
                return onError(new Error('Socket closed before finished writing response'));
            }
            if (ctx.incomingRes) {
                // start the span that is responsible for recording the start time of the entire middleware run on the stack
                ctx.resMiddlewareSpan = telemetry_1.telemetry.startSpan({
                    name: 'response:middleware',
                    parentSpan: handleHttpRequestSpan,
                    isVerbose,
                });
                return _runStage(HttpStages.IncomingResponse, ctx, onError)
                    .finally(() => {
                    var _a;
                    (_a = ctx.resMiddlewareSpan) === null || _a === void 0 ? void 0 : _a.end();
                });
            }
            return ctx.debug('Warning: Request was not fulfilled with a response.');
        });
    }
    async handleSourceMapRequest(req, res) {
        try {
            const sm = await this.deferredSourceMapCache.resolve(req.params.id, req.headers);
            if (!sm) {
                throw new Error('no sourcemap found');
            }
            res.json(sm);
        }
        catch (err) {
            res.status(500).json({ err });
        }
    }
    reset() {
        this.buffers.reset();
        this.setAUTUrl(undefined);
        this.preRequests.reset();
    }
    setBuffer(buffer) {
        return this.buffers.set(buffer);
    }
    addPendingBrowserPreRequest(browserPreRequest) {
        this.preRequests.addPending(browserPreRequest);
    }
    removePendingBrowserPreRequest(requestId) {
        this.preRequests.removePendingPreRequest(requestId);
    }
    addPendingUrlWithoutPreRequest(url) {
        this.preRequests.addPendingUrlWithoutPreRequest(url);
    }
    setProtocolManager(protocolManager) {
        this.protocolManager = protocolManager;
        this.preRequests.setProtocolManager(protocolManager);
    }
    setPreRequestTimeout(timeout) {
        this.preRequests.setPreRequestTimeout(timeout);
    }
}
exports.Http = Http;
