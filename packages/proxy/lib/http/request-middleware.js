"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const lodash_1 = tslib_1.__importDefault(require("lodash"));
const network_1 = require(process.argv[1]+"/../packages/network");
const net_stubbing_1 = require(process.argv[1]+"/../packages/net-stubbing");
const telemetry_1 = require(process.argv[1]+"/../packages/telemetry");
const _1 = require(".");
const cookies_1 = require("./util/cookies");
const top_simulation_1 = require("./util/top-simulation");
// do not use a debug namespace in this file - use the per-request `this.debug` instead
// available as cypress-verbose:proxy:http
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const debug = null;
const LogRequest = function () {
    this.debug('proxying request %o', {
        req: lodash_1.default.pick(this.req, 'method', 'proxiedUrl', 'headers'),
    });
    this.next();
};
const ExtractCypressMetadataHeaders = function () {
    const span = telemetry_1.telemetry.startSpan({ name: 'extract:cypress:metadata:headers', parentSpan: this.reqMiddlewareSpan, isVerbose: _1.isVerboseTelemetry });
    this.req.isAUTFrame = !!this.req.headers['x-cypress-is-aut-frame'];
    this.req.isFromExtraTarget = !!this.req.headers['x-cypress-is-from-extra-target'];
    if (this.req.headers['x-cypress-is-aut-frame']) {
        delete this.req.headers['x-cypress-is-aut-frame'];
    }
    span === null || span === void 0 ? void 0 : span.setAttributes({
        isAUTFrame: this.req.isAUTFrame,
        isFromExtraTarget: this.req.isFromExtraTarget,
    });
    // we only want to intercept requests from the main target and not ones from
    // extra tabs or windows, so run the bare minimum request/response middleware
    // to send the request/response directly through
    if (this.req.isFromExtraTarget) {
        this.debug('request for [%s %s] is from an extra target', this.req.method, this.req.proxiedUrl);
        delete this.req.headers['x-cypress-is-from-extra-target'];
        this.onlyRunMiddleware([
            'MaybeSetBasicAuthHeaders',
            'SendRequestOutgoing',
        ]);
    }
    span === null || span === void 0 ? void 0 : span.end();
    this.next();
};
const MaybeSimulateSecHeaders = function () {
    const span = telemetry_1.telemetry.startSpan({ name: 'maybe:simulate:sec:headers', parentSpan: this.reqMiddlewareSpan, isVerbose: _1.isVerboseTelemetry });
    span === null || span === void 0 ? void 0 : span.setAttributes({
        experimentalModifyObstructiveThirdPartyCode: this.config.experimentalModifyObstructiveThirdPartyCode,
    });
    if (!this.config.experimentalModifyObstructiveThirdPartyCode) {
        span === null || span === void 0 ? void 0 : span.end();
        this.next();
        return;
    }
    // Do NOT disclose destination to an iframe and simulate if iframe was top
    if (this.req.isAUTFrame && this.req.headers['sec-fetch-dest'] === 'iframe') {
        const secFetchDestModifiedTo = 'document';
        span === null || span === void 0 ? void 0 : span.setAttributes({
            secFetchDestModifiedFrom: this.req.headers['sec-fetch-dest'],
            secFetchDestModifiedTo,
        });
        this.req.headers['sec-fetch-dest'] = secFetchDestModifiedTo;
    }
    span === null || span === void 0 ? void 0 : span.end();
    this.next();
};
const CorrelateBrowserPreRequest = async function () {
    const span = telemetry_1.telemetry.startSpan({ name: 'correlate:prerequest', parentSpan: this.reqMiddlewareSpan, isVerbose: _1.isVerboseTelemetry });
    const shouldCorrelatePreRequests = this.shouldCorrelatePreRequests();
    span === null || span === void 0 ? void 0 : span.setAttributes({
        shouldCorrelatePreRequest: shouldCorrelatePreRequests,
    });
    if (!this.shouldCorrelatePreRequests()) {
        span === null || span === void 0 ? void 0 : span.end();
        return this.next();
    }
    const copyResourceTypeAndNext = () => {
        var _a;
        this.req.resourceType = (_a = this.req.browserPreRequest) === null || _a === void 0 ? void 0 : _a.resourceType;
        span === null || span === void 0 ? void 0 : span.setAttributes({
            resourceType: this.req.resourceType,
        });
        span === null || span === void 0 ? void 0 : span.end();
        return this.next();
    };
    if (this.req.headers['x-cypress-resolving-url']) {
        this.debug('skipping prerequest for resolve:url');
        delete this.req.headers['x-cypress-resolving-url'];
        const requestId = `cy.visit-${Date.now()}`;
        this.req.browserPreRequest = {
            requestId,
            method: this.req.method,
            url: this.req.proxiedUrl,
            // @ts-ignore
            headers: this.req.headers,
            resourceType: 'document',
            originalResourceType: 'document',
        };
        this.res.on('close', () => {
            this.socket.toDriver('request:event', 'response:received', {
                requestId,
                headers: this.res.getHeaders(),
                status: this.res.statusCode,
            });
        });
        return copyResourceTypeAndNext();
    }
    this.debug('waiting for prerequest');
    this.pendingRequest = this.getPreRequest((({ browserPreRequest, noPreRequestExpected }) => {
        this.req.browserPreRequest = browserPreRequest;
        this.req.noPreRequestExpected = noPreRequestExpected;
        copyResourceTypeAndNext();
    }));
};
const CalculateCredentialLevelIfApplicable = function () {
    if (!(0, top_simulation_1.doesTopNeedToBeSimulated)(this) ||
        (this.req.resourceType !== undefined && this.req.resourceType !== 'xhr' && this.req.resourceType !== 'fetch')) {
        this.next();
        return;
    }
    this.debug(`looking up credentials for ${this.req.proxiedUrl}`);
    const { credentialStatus, resourceType } = this.resourceTypeAndCredentialManager.get(this.req.proxiedUrl, this.req.resourceType);
    this.debug(`credentials calculated for ${resourceType}:${credentialStatus}`);
    // if for some reason the resourceType is not set by the prerequest, have a fallback in place
    this.req.resourceType = !this.req.resourceType ? resourceType : this.req.resourceType;
    this.req.credentialsLevel = credentialStatus;
    this.next();
};
const MaybeAttachCrossOriginCookies = function () {
    const span = telemetry_1.telemetry.startSpan({ name: 'maybe:attach:cross:origin:cookies', parentSpan: this.reqMiddlewareSpan, isVerbose: _1.isVerboseTelemetry });
    const doesTopNeedSimulation = (0, top_simulation_1.doesTopNeedToBeSimulated)(this);
    span === null || span === void 0 ? void 0 : span.setAttributes({
        doesTopNeedToBeSimulated: doesTopNeedSimulation,
        resourceType: this.req.resourceType,
    });
    if (!doesTopNeedSimulation) {
        span === null || span === void 0 ? void 0 : span.end();
        return this.next();
    }
    // Top needs to be simulated since the AUT is in a cross origin state. Get the "requested with" and credentials and see what cookies need to be attached
    const currentAUTUrl = this.getAUTUrl();
    const shouldCookiesBeAttachedToRequest = (0, cookies_1.shouldAttachAndSetCookies)(this.req.proxiedUrl, currentAUTUrl, this.req.resourceType, this.req.credentialsLevel, this.req.isAUTFrame);
    span === null || span === void 0 ? void 0 : span.setAttributes({
        currentAUTUrl,
        shouldCookiesBeAttachedToRequest,
    });
    this.debug(`should cookies be attached to request?: ${shouldCookiesBeAttachedToRequest}`);
    if (!shouldCookiesBeAttachedToRequest) {
        span === null || span === void 0 ? void 0 : span.end();
        return this.next();
    }
    const sameSiteContext = (0, cookies_1.getSameSiteContext)(currentAUTUrl, this.req.proxiedUrl, this.req.isAUTFrame);
    span === null || span === void 0 ? void 0 : span.setAttributes({
        sameSiteContext,
        currentAUTUrl,
        isAUTFrame: this.req.isAUTFrame,
    });
    const applicableCookiesInCookieJar = this.getCookieJar().getCookies(this.req.proxiedUrl, sameSiteContext);
    const cookiesOnRequest = (this.req.headers['cookie'] || '').split('; ');
    const existingCookiesInJar = applicableCookiesInCookieJar.join('; ');
    const addedCookiesFromHeader = cookiesOnRequest.join('; ');
    this.debug('existing cookies on request from cookie jar: %s', existingCookiesInJar);
    this.debug('add cookies to request from header: %s', addedCookiesFromHeader);
    // if the cookie header is empty (i.e. ''), set it to undefined for expected behavior
    this.req.headers['cookie'] = (0, cookies_1.addCookieJarCookiesToRequest)(applicableCookiesInCookieJar, cookiesOnRequest) || undefined;
    span === null || span === void 0 ? void 0 : span.setAttributes({
        existingCookiesInJar,
        addedCookiesFromHeader,
        cookieHeader: this.req.headers['cookie'],
    });
    this.debug('cookies being sent with request: %s', this.req.headers['cookie']);
    span === null || span === void 0 ? void 0 : span.end();
    this.next();
};
function shouldLog(req) {
    var _a;
    // 1. Any matching `cy.intercept()` should cause `req` to be logged by default, unless `log: false` is passed explicitly.
    if ((_a = req.matchingRoutes) === null || _a === void 0 ? void 0 : _a.length) {
        const lastMatchingRoute = req.matchingRoutes[0];
        if (!lastMatchingRoute.staticResponse) {
            // No StaticResponse is set, therefore the request must be logged.
            return true;
        }
        if (lastMatchingRoute.staticResponse.log !== undefined) {
            return Boolean(lastMatchingRoute.staticResponse.log);
        }
    }
    // 2. Otherwise, only log if it is an XHR or fetch.
    return req.resourceType === 'fetch' || req.resourceType === 'xhr';
}
const SendToDriver = function () {
    const span = telemetry_1.telemetry.startSpan({ name: 'send:to:driver', parentSpan: this.reqMiddlewareSpan, isVerbose: _1.isVerboseTelemetry });
    const shouldLogReq = shouldLog(this.req);
    if (shouldLogReq && this.req.browserPreRequest) {
        this.socket.toDriver('request:event', 'incoming:request', this.req.browserPreRequest);
    }
    span === null || span === void 0 ? void 0 : span.setAttributes({
        shouldLogReq,
        hasBrowserPreRequest: !!this.req.browserPreRequest,
    });
    span === null || span === void 0 ? void 0 : span.end();
    this.next();
};
const MaybeEndRequestWithBufferedResponse = function () {
    var _a;
    const span = telemetry_1.telemetry.startSpan({ name: 'maybe:end:with:buffered:response', parentSpan: this.reqMiddlewareSpan, isVerbose: _1.isVerboseTelemetry });
    const buffer = this.buffers.take(this.req.proxiedUrl);
    span === null || span === void 0 ? void 0 : span.setAttributes({
        hasBuffer: !!buffer,
    });
    if (buffer) {
        this.debug('ending request with buffered response');
        // NOTE: Only inject fullCrossOrigin here if the super domain origins do not match in order to keep parity with cypress application reloads
        this.res.wantsInjection = buffer.urlDoesNotMatchPolicyBasedOnDomain ? 'fullCrossOrigin' : 'full';
        span === null || span === void 0 ? void 0 : span.setAttributes({
            wantsInjection: this.res.wantsInjection,
        });
        span === null || span === void 0 ? void 0 : span.end();
        (_a = this.reqMiddlewareSpan) === null || _a === void 0 ? void 0 : _a.end();
        return this.onResponse(buffer.response, buffer.stream);
    }
    span === null || span === void 0 ? void 0 : span.end();
    this.next();
};
const RedirectToClientRouteIfUnloaded = function () {
    const span = telemetry_1.telemetry.startSpan({ name: 'redirect:to:client:route:if:unloaded', parentSpan: this.reqMiddlewareSpan, isVerbose: _1.isVerboseTelemetry });
    const hasAppUnloaded = this.req.cookies['__cypress.unload'];
    span === null || span === void 0 ? void 0 : span.setAttributes({
        hasAppUnloaded,
    });
    // if we have an unload header it means our parent app has been navigated away
    // directly and we need to automatically redirect to the clientRoute
    if (hasAppUnloaded) {
        span === null || span === void 0 ? void 0 : span.setAttributes({
            redirectedTo: this.config.clientRoute,
        });
        this.res.redirect(this.config.clientRoute);
        span === null || span === void 0 ? void 0 : span.end();
        return this.end();
    }
    span === null || span === void 0 ? void 0 : span.end();
    this.next();
};
const EndRequestsToBlockedHosts = function () {
    const span = telemetry_1.telemetry.startSpan({ name: 'end:requests:to:block:hosts', parentSpan: this.reqMiddlewareSpan, isVerbose: _1.isVerboseTelemetry });
    const { blockHosts } = this.config;
    span === null || span === void 0 ? void 0 : span.setAttributes({
        areBlockHostsConfigured: !!blockHosts,
    });
    if (blockHosts) {
        const matches = network_1.blocked.matches(this.req.proxiedUrl, blockHosts);
        span === null || span === void 0 ? void 0 : span.setAttributes({
            didUrlMatchBlockedHosts: !!matches,
        });
        if (matches) {
            this.res.set('x-cypress-matched-blocked-host', matches);
            this.debug('blocking request %o', { matches });
            this.res.status(503).end();
            span === null || span === void 0 ? void 0 : span.end();
            return this.end();
        }
    }
    this.next();
};
const StripUnsupportedAcceptEncoding = function () {
    const span = telemetry_1.telemetry.startSpan({ name: 'strip:unsupported:accept:encoding', parentSpan: this.reqMiddlewareSpan, isVerbose: _1.isVerboseTelemetry });
    // Cypress can only support plaintext or gzip, so make sure we don't request anything else, by either filtering down to `gzip` or explicitly specifying `identity`
    const acceptEncoding = this.req.headers['accept-encoding'];
    span === null || span === void 0 ? void 0 : span.setAttributes({
        acceptEncodingHeaderPresent: !!acceptEncoding,
    });
    if (acceptEncoding) {
        const doesAcceptHeadingIncludeGzip = acceptEncoding.includes('gzip');
        span === null || span === void 0 ? void 0 : span.setAttributes({
            doesAcceptHeadingIncludeGzip,
        });
        if (doesAcceptHeadingIncludeGzip) {
            this.req.headers['accept-encoding'] = 'gzip';
        }
        else {
            this.req.headers['accept-encoding'] = 'identity';
        }
    }
    else {
        // If there is no accept-encoding header, it means to accept everything (https://www.rfc-editor.org/rfc/rfc9110#name-accept-encoding).
        // In that case, we want to explicitly filter that down to `gzip` and identity
        this.req.headers['accept-encoding'] = 'gzip,identity';
    }
    span === null || span === void 0 ? void 0 : span.end();
    this.next();
};
function reqNeedsBasicAuthHeaders(req, { auth, origin }) {
    //if we have auth headers, this request matches our origin, protection space, and the user has not supplied auth headers
    return auth && !req.headers['authorization'] && network_1.cors.urlMatchesOriginProtectionSpace(req.proxiedUrl, origin);
}
const MaybeSetBasicAuthHeaders = function () {
    const span = telemetry_1.telemetry.startSpan({ name: 'maybe:set:basic:auth:headers', parentSpan: this.reqMiddlewareSpan, isVerbose: _1.isVerboseTelemetry });
    // get the remote state for the proxied url
    const remoteState = this.remoteStates.get(this.req.proxiedUrl);
    const doesReqNeedBasicAuthHeaders = (remoteState === null || remoteState === void 0 ? void 0 : remoteState.auth) && reqNeedsBasicAuthHeaders(this.req, remoteState);
    span === null || span === void 0 ? void 0 : span.setAttributes({
        doesReqNeedBasicAuthHeaders,
    });
    if ((remoteState === null || remoteState === void 0 ? void 0 : remoteState.auth) && doesReqNeedBasicAuthHeaders) {
        const { auth } = remoteState;
        const base64 = Buffer.from(`${auth.username}:${auth.password}`).toString('base64');
        this.req.headers['authorization'] = `Basic ${base64}`;
    }
    span === null || span === void 0 ? void 0 : span.end();
    this.next();
};
const SendRequestOutgoing = function () {
    var _a, _b;
    // end the request middleware span here before we make
    // our outbound request so we can see that outside
    // of the internal cypress middleware handlers
    (_a = this.reqMiddlewareSpan) === null || _a === void 0 ? void 0 : _a.end();
    // the actual req/resp time outbound from the proxy server
    const span = telemetry_1.telemetry.startSpan({
        name: 'outgoing:request:ttfb',
        parentSpan: this.handleHttpRequestSpan,
        isVerbose: _1.isVerboseTelemetry,
    });
    const requestOptions = {
        browserPreRequest: this.req.browserPreRequest,
        timeout: this.req.responseTimeout,
        strictSSL: false,
        followRedirect: this.req.followRedirect || false,
        retryIntervals: [],
        url: this.req.proxiedUrl,
        time: !!span, // include timingPhases
    };
    const requestBodyBuffered = !!this.req.body;
    const { strategy, origin, fileServer } = this.remoteStates.current();
    span === null || span === void 0 ? void 0 : span.setAttributes({
        requestBodyBuffered,
        strategy,
    });
    if (strategy === 'file' && requestOptions.url.startsWith(origin)) {
        this.req.headers['x-cypress-authorization'] = this.getFileServerToken();
        requestOptions.url = requestOptions.url.replace(origin, fileServer);
    }
    if (requestBodyBuffered) {
        lodash_1.default.assign(requestOptions, lodash_1.default.pick(this.req, 'method', 'body', 'headers'));
    }
    const req = this.request.create(requestOptions);
    const socket = this.req.socket;
    const onSocketClose = () => {
        var _a, _b, _c;
        this.debug('request aborted');
        // if the request is aborted, close out the middleware span and http span. the response middleware did not run
        const pendingRequest = this.pendingRequest;
        if (pendingRequest) {
            delete this.pendingRequest;
            this.removePendingRequest(pendingRequest);
        }
        (_a = this.reqMiddlewareSpan) === null || _a === void 0 ? void 0 : _a.setAttributes({
            requestAborted: true,
        });
        (_b = this.reqMiddlewareSpan) === null || _b === void 0 ? void 0 : _b.end();
        (_c = this.handleHttpRequestSpan) === null || _c === void 0 ? void 0 : _c.end();
        req.abort();
    };
    req.on('error', this.onError);
    req.on('response', (incomingRes) => {
        if (span) {
            const { timings } = incomingRes.request;
            if (!timings.socket) {
                timings.socket = 0;
            }
            if (!timings.lookup) {
                timings.lookup = timings.socket;
            }
            if (!timings.connect) {
                timings.connect = timings.lookup;
            }
            if (!timings.response) {
                timings.response = timings.connect;
            }
            span.setAttributes({
                'request.timing.socket': timings.socket,
                'request.timing.dns': timings.lookup - timings.socket,
                'request.timing.tcp': timings.connect - timings.lookup,
                'request.timing.firstByte': timings.response - timings.connect,
                'request.timing.totalUntilFirstByte': timings.response,
                // download and total are not available yet
            });
            span.end();
        }
        this.onResponse(incomingRes, req);
    });
    // NOTE: this is an odd place to remove this listener
    (_b = this.req.res) === null || _b === void 0 ? void 0 : _b.on('finish', () => {
        socket.removeListener('close', onSocketClose);
    });
    this.req.socket.on('close', onSocketClose);
    if (!requestBodyBuffered) {
        // pipe incoming request body, headers to new request
        this.req.pipe(req);
    }
    this.outgoingReq = req;
};
exports.default = {
    LogRequest,
    ExtractCypressMetadataHeaders,
    MaybeSimulateSecHeaders,
    CorrelateBrowserPreRequest,
    CalculateCredentialLevelIfApplicable,
    MaybeAttachCrossOriginCookies,
    MaybeEndRequestWithBufferedResponse,
    SetMatchingRoutes: net_stubbing_1.SetMatchingRoutes,
    SendToDriver,
    InterceptRequest: net_stubbing_1.InterceptRequest,
    RedirectToClientRouteIfUnloaded,
    EndRequestsToBlockedHosts,
    StripUnsupportedAcceptEncoding,
    MaybeSetBasicAuthHeaders,
    SendRequestOutgoing,
};
