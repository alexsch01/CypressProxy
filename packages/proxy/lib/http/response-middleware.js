"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const charset_1 = tslib_1.__importDefault(require("charset"));
const crypto_1 = tslib_1.__importDefault(require("crypto"));
const iconv_lite_1 = tslib_1.__importDefault(require("iconv-lite"));
const lodash_1 = tslib_1.__importDefault(require("lodash"));
const stream_1 = require("stream");
const url_1 = require("url");
const zlib_1 = tslib_1.__importDefault(require("zlib"));
const net_stubbing_1 = require(process.argv[1]+"/../packages/net-stubbing");
const network_1 = require(process.argv[1]+"/../packages/network");
const cookies_1 = require(process.argv[1]+"/../packages/server/lib/util/cookies");
const telemetry_1 = require(process.argv[1]+"/../packages/telemetry");
const _1 = require(".");
const cookies_2 = require("./util/cookies");
const rewriter = tslib_1.__importStar(require("./util/rewriter"));
const top_simulation_1 = require("./util/top-simulation");
const csp_header_1 = require("./util/csp-header");
// do not use a debug namespace in this file - use the per-request `this.debug` instead
// available as cypress-verbose:proxy:http
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const debug = null;
// https://github.com/cypress-io/cypress/issues/1756
const zlibOptions = {
    flush: zlib_1.default.constants.Z_SYNC_FLUSH,
    finishFlush: zlib_1.default.constants.Z_SYNC_FLUSH,
};
// https://github.com/cypress-io/cypress/issues/1543
function getNodeCharsetFromResponse(headers, body, debug) {
    const httpCharset = ((0, charset_1.default)(headers, body, 1024) || '').toLowerCase();
    debug('inferred charset from response %o', { httpCharset });
    if (iconv_lite_1.default.encodingExists(httpCharset)) {
        return httpCharset;
    }
    // browsers default to latin1
    return 'latin1';
}
function reqMatchesPolicyBasedOnDomain(req, remoteState, skipDomainInjectionForDomains) {
    if (remoteState.strategy === 'http') {
        return network_1.cors.urlMatchesPolicyBasedOnDomainProps(req.proxiedUrl, remoteState.props, {
            skipDomainInjectionForDomains,
        });
    }
    if (remoteState.strategy === 'file') {
        return req.proxiedUrl.startsWith(remoteState.origin);
    }
    return false;
}
function reqWillRenderHtml(req, res) {
    // will this request be rendered in the browser, necessitating injection?
    // https://github.com/cypress-io/cypress/issues/288
    // don't inject if this is an XHR from jquery
    if (req.headers['x-requested-with']) {
        return;
    }
    // don't inject if we didn't find both text/html and application/xhtml+xml,
    const accept = req.headers['accept'];
    // only check the content-type value, if it exists, to contains some type of html mimetype
    const contentType = (res === null || res === void 0 ? void 0 : res.headers['content-type']) || '';
    const contentTypeIsHtmlIfExists = contentType ? contentType.includes('html') : true;
    return accept && accept.includes('text/html') && accept.includes('application/xhtml+xml') && contentTypeIsHtmlIfExists;
}
function resContentTypeIs(res, contentType) {
    return (res.headers['content-type'] || '').includes(contentType);
}
function resContentTypeIsJavaScript(res) {
    return lodash_1.default.some(['application/javascript', 'application/x-javascript', 'text/javascript']
        .map(lodash_1.default.partial(resContentTypeIs, res)));
}
function resIsGzipped(res) {
    return (res.headers['content-encoding'] || '').includes('gzip');
}
function setCookie(res, k, v, domain) {
    let opts = { domain };
    if (!v) {
        v = '';
        opts.expires = new Date(0);
    }
    return res.cookie(k, v, opts);
}
function setInitialCookie(res, remoteState, value) {
    // dont modify any cookies if we're trying to clear the initial cookie and we're not injecting anything
    // dont set the cookies if we're not on the initial request
    if ((!value && !res.wantsInjection) || !res.isInitial) {
        return;
    }
    return setCookie(res, '__cypress.initial', value, remoteState.domainName);
}
// "autoplay *; document-domain 'none'" => { autoplay: "*", "document-domain": "'none'" }
const parseFeaturePolicy = (policy) => {
    const pairs = policy.split('; ').map((directive) => directive.split(' '));
    return lodash_1.default.fromPairs(pairs);
};
// { autoplay: "*", "document-domain": "'none'" } => "autoplay *; document-domain 'none'"
const stringifyFeaturePolicy = (policy) => {
    const pairs = lodash_1.default.toPairs(policy);
    return pairs.map((directive) => directive.join(' ')).join('; ');
};
const requestIdRegEx = /^(.*)-retry-([\d]+)$/;
const getOriginalRequestId = (requestId) => {
    let originalRequestId = requestId;
    const match = requestIdRegEx.exec(requestId);
    if (match) {
        [, originalRequestId] = match;
    }
    return originalRequestId;
};
const LogResponse = function () {
    this.debug('received response %o', {
        browserPreRequest: lodash_1.default.pick(this.req.browserPreRequest, 'requestId'),
        req: lodash_1.default.pick(this.req, 'method', 'proxiedUrl', 'headers'),
        incomingRes: lodash_1.default.pick(this.incomingRes, 'headers', 'statusCode'),
    });
    this.next();
};
const FilterNonProxiedResponse = function () {
    // if the request is from an extra target (i.e. not the main Cypress tab, but
    // an extra tab/window), we want to skip any manipulation of the response and
    // only run the middleware necessary to get it back to the browser
    if (this.req.isFromExtraTarget) {
        this.debug('response for [%s %s] is from extra target', this.req.method, this.req.proxiedUrl);
        // this is normally done in the OmitProblematicHeaders middleware, but we
        // don't want to omit any headers in this case
        this.res.set(this.incomingRes.headers);
        this.onlyRunMiddleware([
            'AttachPlainTextStreamFn',
            'PatchExpressSetHeader',
            'MaybeSendRedirectToClient',
            'CopyResponseStatusCode',
            'MaybeEndWithEmptyBody',
            'GzipBody',
            'SendResponseBodyToClient',
        ]);
    }
    this.next();
};
const AttachPlainTextStreamFn = function () {
    this.makeResStreamPlainText = function () {
        const span = telemetry_1.telemetry.startSpan({ name: 'make:res:stream:plain:text', parentSpan: this.resMiddlewareSpan, isVerbose: _1.isVerboseTelemetry });
        this.debug('ensuring resStream is plaintext');
        const isResGunzupped = resIsGzipped(this.incomingRes);
        span === null || span === void 0 ? void 0 : span.setAttributes({
            isResGunzupped,
        });
        if (!this.isGunzipped && isResGunzupped) {
            this.debug('gunzipping response body');
            const gunzip = zlib_1.default.createGunzip(zlibOptions);
            // TODO: how do we measure the ctx pipe via telemetry?
            this.incomingResStream = this.incomingResStream.pipe(gunzip).on('error', this.onError);
            this.isGunzipped = true;
        }
        span === null || span === void 0 ? void 0 : span.end();
    };
    this.next();
};
const PatchExpressSetHeader = function () {
    const { incomingRes } = this;
    const originalSetHeader = this.res.setHeader;
    // Node uses their own Symbol object, so use this to get the internal kOutHeaders
    // symbol - Symbol.for('kOutHeaders') will not work
    const getKOutHeadersSymbol = () => {
        const findKOutHeadersSymbol = () => {
            return lodash_1.default.find(Object.getOwnPropertySymbols(this.res), (sym) => {
                return sym.toString() === 'Symbol(kOutHeaders)';
            });
        };
        let sym = findKOutHeadersSymbol();
        if (sym) {
            return sym;
        }
        // force creation of a new header field so the kOutHeaders key is available
        this.res.setHeader('X-Cypress-HTTP-Response', 'X');
        this.res.removeHeader('X-Cypress-HTTP-Response');
        sym = findKOutHeadersSymbol();
        if (!sym) {
            throw new Error('unable to find kOutHeaders symbol');
        }
        return sym;
    };
    let kOutHeaders;
    const ctxDebug = this.debug;
    // @ts-expect-error
    this.res.setHeader = function (name, value) {
        // express.Response.setHeader does all kinds of silly/nasty stuff to the content-type...
        // but we don't want to change it at all!
        if (name === 'content-type') {
            value = incomingRes.headers['content-type'] || value;
        }
        // run the original function - if an "invalid header char" error is raised,
        // set the header manually. this way we can retain Node's original error behavior
        try {
            return originalSetHeader.call(this, name, value);
        }
        catch (err) {
            if (err.code !== 'ERR_INVALID_CHAR') {
                throw err;
            }
            ctxDebug('setHeader error ignored %o', { name, value, code: err.code, err });
            if (!kOutHeaders) {
                kOutHeaders = getKOutHeadersSymbol();
            }
            // https://github.com/nodejs/node/blob/42cce5a9d0fd905bf4ad7a2528c36572dfb8b5ad/lib/_http_outgoing.js#L483-L495
            let headers = this[kOutHeaders];
            if (!headers) {
                this[kOutHeaders] = headers = Object.create(null);
            }
            headers[name.toLowerCase()] = [name, value];
        }
    };
    this.next();
};
const OmitProblematicHeaders = function () {
    const span = telemetry_1.telemetry.startSpan({ name: 'omit:problematic:header', parentSpan: this.resMiddlewareSpan, isVerbose: _1.isVerboseTelemetry });
    const headers = lodash_1.default.omit(this.incomingRes.headers, [
        'set-cookie',
        'x-frame-options',
        'content-length',
        'transfer-encoding',
        'connection',
    ]);
    this.res.set(headers);
    span === null || span === void 0 ? void 0 : span.setAttributes({
        experimentalCspAllowList: this.config.experimentalCspAllowList,
    });
    if (this.config.experimentalCspAllowList) {
        const allowedDirectives = this.config.experimentalCspAllowList === true ? [] : this.config.experimentalCspAllowList;
        // If the user has specified CSP directives to allow, we must not remove them from the CSP headers
        const stripDirectives = [...csp_header_1.unsupportedCSPDirectives, ...csp_header_1.problematicCspDirectives.filter((directive) => !allowedDirectives.includes(directive))];
        // Iterate through each CSP header
        csp_header_1.cspHeaderNames.forEach((headerName) => {
            const modifiedCspHeaders = (0, csp_header_1.parseCspHeaders)(this.incomingRes.headers, headerName, stripDirectives)
                .map(csp_header_1.generateCspDirectives)
                .filter(Boolean);
            if (modifiedCspHeaders.length === 0) {
                // If there are no CSP policies after stripping directives, we will remove it from the response
                // Altering the CSP headers using the native response header methods is case-insensitive
                this.res.removeHeader(headerName);
            }
            else {
                // To replicate original response CSP headers, we must apply all header values as an array
                this.res.setHeader(headerName, modifiedCspHeaders);
            }
        });
    }
    else {
        csp_header_1.cspHeaderNames.forEach((headerName) => {
            // Altering the CSP headers using the native response header methods is case-insensitive
            this.res.removeHeader(headerName);
        });
    }
    span === null || span === void 0 ? void 0 : span.end();
    this.next();
};
const SetInjectionLevel = function () {
    const span = telemetry_1.telemetry.startSpan({ name: 'set:injection:level', parentSpan: this.resMiddlewareSpan, isVerbose: _1.isVerboseTelemetry });
    this.res.isInitial = this.req.cookies['__cypress.initial'] === 'true';
    const isHTML = resContentTypeIs(this.incomingRes, 'text/html');
    const isRenderedHTML = reqWillRenderHtml(this.req, this.incomingRes);
    if (isRenderedHTML) {
        const origin = new url_1.URL(this.req.proxiedUrl).origin;
        this.getRenderedHTMLOrigins()[origin] = true;
    }
    this.debug('determine injection');
    const isReqMatchSuperDomainOrigin = reqMatchesPolicyBasedOnDomain(this.req, this.remoteStates.current(), this.config.experimentalSkipDomainInjection);
    span === null || span === void 0 ? void 0 : span.setAttributes({
        isInitialInjection: this.res.isInitial,
        isHTML,
        isRenderedHTML,
        isReqMatchSuperDomainOrigin,
    });
    const getInjectionLevel = () => {
        if (this.incomingRes.headers['x-cypress-file-server-error'] && !this.res.isInitial) {
            this.debug('- partial injection (x-cypress-file-server-error)');
            return 'partial';
        }
        // NOTE: Only inject fullCrossOrigin if the super domain origins do not match in order to keep parity with cypress application reloads
        const urlDoesNotMatchPolicyBasedOnDomain = !reqMatchesPolicyBasedOnDomain(this.req, this.remoteStates.getPrimary(), this.config.experimentalSkipDomainInjection);
        const isAUTFrame = this.req.isAUTFrame;
        const isHTMLLike = isHTML || isRenderedHTML;
        span === null || span === void 0 ? void 0 : span.setAttributes({
            isAUTFrame,
            urlDoesNotMatchPolicyBasedOnDomain,
        });
        if (urlDoesNotMatchPolicyBasedOnDomain && isAUTFrame && isHTMLLike) {
            this.debug('- cross origin injection');
            return 'fullCrossOrigin';
        }
        if (!isHTML || (!isReqMatchSuperDomainOrigin && !isAUTFrame)) {
            this.debug('- no injection (not html)');
            return false;
        }
        if (this.res.isInitial && isHTMLLike) {
            this.debug('- full injection');
            return 'full';
        }
        if (!isRenderedHTML) {
            this.debug('- no injection (not rendered html)');
            return false;
        }
        this.debug('- partial injection (default)');
        return 'partial';
    };
    if (this.res.wantsInjection != null) {
        span === null || span === void 0 ? void 0 : span.setAttributes({
            isInjectionAlreadySet: true,
        });
        this.debug('- already has injection: %s', this.res.wantsInjection);
    }
    if (this.res.wantsInjection == null) {
        this.res.wantsInjection = getInjectionLevel();
    }
    if (this.res.wantsInjection) {
        // Chrome plans to make document.domain immutable in Chrome 109, with the default value
        // of the Origin-Agent-Cluster header becoming 'true'. We explicitly disable this header
        // so that we can continue to support tests that visit multiple subdomains in a single spec.
        // https://github.com/cypress-io/cypress/issues/20147
        //
        // We set the header here only for proxied requests that have scripts injected that set the domain.
        // Other proxied requests are ignored.
        this.res.setHeader('Origin-Agent-Cluster', '?0');
        // In order to allow the injected script to run on sites with a CSP header
        // we must add a generated `nonce` into the response headers
        const nonce = crypto_1.default.randomBytes(16).toString('base64');
        // Iterate through each CSP header
        csp_header_1.cspHeaderNames.forEach((headerName) => {
            const policyArray = (0, csp_header_1.parseCspHeaders)(this.res.getHeaders(), headerName);
            const usedNonceDirectives = csp_header_1.nonceDirectives
                // If there are no used CSP directives that restrict script src execution, our script will run
                // without the nonce, so we will not add it to the response
                .filter((directive) => policyArray.some((policyMap) => policyMap.has(directive)));
            if (usedNonceDirectives.length) {
                // If there is a CSP directive that that restrict script src execution, we must add the
                // nonce policy to each supported directive of each CSP header. This is due to the effect
                // of [multiple policies](https://w3c.github.io/webappsec-csp/#multiple-policies) in CSP.
                this.res.injectionNonce = nonce;
                const modifiedCspHeader = policyArray.map((policies) => {
                    usedNonceDirectives.forEach((availableNonceDirective) => {
                        if (policies.has(availableNonceDirective)) {
                            const cspScriptSrc = policies.get(availableNonceDirective) || [];
                            // We are mutating the policy map, and we will set it back to the response headers later
                            policies.set(availableNonceDirective, [...cspScriptSrc, `'nonce-${nonce}'`]);
                        }
                    });
                    return policies;
                }).map(csp_header_1.generateCspDirectives);
                // To replicate original response CSP headers, we must apply all header values as an array
                this.res.setHeader(headerName, modifiedCspHeader);
            }
        });
    }
    this.res.wantsSecurityRemoved = (this.config.modifyObstructiveCode || this.config.experimentalModifyObstructiveThirdPartyCode) &&
        // if experimentalModifyObstructiveThirdPartyCode is enabled, we want to modify all framebusting code that is html or javascript that passes through the proxy
        ((this.config.experimentalModifyObstructiveThirdPartyCode
            && (isHTML || isRenderedHTML || resContentTypeIsJavaScript(this.incomingRes))) ||
            this.res.wantsInjection === 'full' ||
            this.res.wantsInjection === 'fullCrossOrigin' ||
            // only modify JavasScript if matching the current origin policy or if experimentalModifyObstructiveThirdPartyCode is enabled (above)
            (resContentTypeIsJavaScript(this.incomingRes) && isReqMatchSuperDomainOrigin));
    span === null || span === void 0 ? void 0 : span.setAttributes({
        wantsInjection: this.res.wantsInjection,
        wantsSecurityRemoved: this.res.wantsSecurityRemoved,
    });
    this.debug('injection levels: %o', lodash_1.default.pick(this.res, 'isInitial', 'wantsInjection', 'wantsSecurityRemoved'));
    span === null || span === void 0 ? void 0 : span.end();
    this.next();
};
// https://github.com/cypress-io/cypress/issues/6480
const MaybeStripDocumentDomainFeaturePolicy = function () {
    const span = telemetry_1.telemetry.startSpan({ name: 'maybe:strip:document:domain:feature:policy', parentSpan: this.resMiddlewareSpan, isVerbose: _1.isVerboseTelemetry });
    const { 'feature-policy': featurePolicy } = this.incomingRes.headers;
    if (featurePolicy) {
        const directives = parseFeaturePolicy(featurePolicy);
        if (directives['document-domain']) {
            delete directives['document-domain'];
            const policy = stringifyFeaturePolicy(directives);
            span === null || span === void 0 ? void 0 : span.setAttributes({
                isFeaturePolicy: !!policy,
            });
            if (policy) {
                this.res.set('feature-policy', policy);
            }
            else {
                this.res.removeHeader('feature-policy');
            }
        }
    }
    span === null || span === void 0 ? void 0 : span.end();
    this.next();
};
const MaybePreventCaching = function () {
    // do not cache injected responses
    // TODO: consider implementing etag system so even injected content can be cached
    if (this.res.wantsInjection) {
        this.res.setHeader('cache-control', 'no-cache, no-store, must-revalidate');
    }
    this.next();
};
const setSimulatedCookies = (ctx) => {
    if (ctx.res.wantsInjection !== 'fullCrossOrigin')
        return;
    const defaultDomain = (new url_1.URL(ctx.req.proxiedUrl)).hostname;
    const allCookiesForRequest = ctx.getCookieJar()
        .getCookies(ctx.req.proxiedUrl)
        .map((cookie) => (0, cookies_1.toughCookieToAutomationCookie)(cookie, defaultDomain));
    ctx.simulatedCookies = allCookiesForRequest;
};
const MaybeCopyCookiesFromIncomingRes = async function () {
    const span = telemetry_1.telemetry.startSpan({ name: 'maybe:copy:cookies:from:incoming:res', parentSpan: this.resMiddlewareSpan, isVerbose: _1.isVerboseTelemetry });
    const cookies = this.incomingRes.headers['set-cookie'];
    const areCookiesPresent = !cookies || !cookies.length;
    span === null || span === void 0 ? void 0 : span.setAttributes({
        areCookiesPresent,
    });
    if (areCookiesPresent) {
        setSimulatedCookies(this);
        span === null || span === void 0 ? void 0 : span.end();
        return this.next();
    }
    // Simulated Top Cookie Handling
    // ---------------------------
    // - We capture cookies sent by responses and add them to our own server-side
    //   tough-cookie cookie jar. All request cookies are captured, since any
    //   future request could be cross-origin in the context of top, even if the response that sets them
    //   is not.
    // - If we sent the cookie header, it may fail to be set by the browser
    //   (in most cases). However, we cannot determine all the cases in which Set-Cookie
    //   will currently fail. We try to address this in our tough cookie jar
    //   by only setting cookies that would otherwise work in the browser if the AUT url was top
    // - We also set the cookies through automation so they are available in the
    //   browser via document.cookie and via Cypress cookie APIs
    //   (e.g. cy.getCookie). This is only done when the AUT url and top do not match responses,
    //   since AUT and Top being same origin will be successfully set in the browser
    //   automatically as expected.
    // - In the request middleware, we retrieve the cookies for a given URL
    //   and attach them to the request, like the browser normally would.
    //   tough-cookie handles retrieving the correct cookies based on domain,
    //   path, etc. It also removes cookies from the cookie jar if they've expired.
    const doesTopNeedSimulating = (0, top_simulation_1.doesTopNeedToBeSimulated)(this);
    span === null || span === void 0 ? void 0 : span.setAttributes({
        doesTopNeedSimulating,
    });
    const appendCookie = (cookie) => {
        // always call 'Set-Cookie' in the browser as cross origin or same site requests
        // can effectively set cookies in the browser if given correct credential permissions
        const headerName = 'Set-Cookie';
        try {
            this.res.append(headerName, cookie);
        }
        catch (err) {
            this.debug(`failed to append header ${headerName}, continuing %o`, { err, cookie });
        }
    };
    if (!doesTopNeedSimulating) {
        [].concat(cookies).forEach((cookie) => {
            appendCookie(cookie);
        });
        span === null || span === void 0 ? void 0 : span.end();
        return this.next();
    }
    const cookiesHelper = new cookies_2.CookiesHelper({
        cookieJar: this.getCookieJar(),
        currentAUTUrl: this.getAUTUrl(),
        debug: this.debug,
        request: {
            url: this.req.proxiedUrl,
            isAUTFrame: this.req.isAUTFrame,
            doesTopNeedSimulating,
            resourceType: this.req.resourceType,
            credentialLevel: this.req.credentialsLevel,
        },
    });
    await cookiesHelper.capturePreviousCookies();
    [].concat(cookies).forEach((cookie) => {
        cookiesHelper.setCookie(cookie);
        appendCookie(cookie);
    });
    setSimulatedCookies(this);
    const addedCookies = await cookiesHelper.getAddedCookies();
    const wereSimCookiesAdded = addedCookies.length;
    span === null || span === void 0 ? void 0 : span.setAttributes({
        wereSimCookiesAdded,
    });
    if (!wereSimCookiesAdded) {
        span === null || span === void 0 ? void 0 : span.end();
        return this.next();
    }
    // we want to set the cookies via automation so they exist in the browser
    // itself. however, firefox will hang if we try to use the extension
    // to set cookies on a url that's in-flight, so we send the cookies down to
    // the driver, let the response go, and set the cookies via automation
    // from the driver once the page has loaded but before we run any further
    // commands
    this.serverBus.once('cross:origin:cookies:received', () => {
        span === null || span === void 0 ? void 0 : span.end();
        this.next();
    });
    this.serverBus.emit('cross:origin:cookies', addedCookies);
};
const REDIRECT_STATUS_CODES = [301, 302, 303, 307, 308];
// TODO: this shouldn't really even be necessary?
const MaybeSendRedirectToClient = function () {
    const span = telemetry_1.telemetry.startSpan({ name: 'maybe:send:redirect:to:client', parentSpan: this.resMiddlewareSpan, isVerbose: _1.isVerboseTelemetry });
    const { statusCode, headers } = this.incomingRes;
    const newUrl = headers['location'];
    const isRedirectNeeded = !REDIRECT_STATUS_CODES.includes(statusCode) || !newUrl;
    span === null || span === void 0 ? void 0 : span.setAttributes({
        isRedirectNeeded,
    });
    if (isRedirectNeeded) {
        span === null || span === void 0 ? void 0 : span.end();
        return this.next();
    }
    // If we're redirecting from a request that doesn't expect to have a preRequest (e.g. download links), we need to treat the redirected url as such as well.
    if (this.req.noPreRequestExpected) {
        this.addPendingUrlWithoutPreRequest(newUrl);
    }
    setInitialCookie(this.res, this.remoteStates.current(), true);
    this.debug('redirecting to new url %o', { statusCode, newUrl });
    this.res.redirect(Number(statusCode), newUrl);
    span === null || span === void 0 ? void 0 : span.end();
    // TODO; how do we instrument end?
    return this.end();
};
const CopyResponseStatusCode = function () {
    this.res.status(Number(this.incomingRes.statusCode));
    // Set custom status message/reason phrase from http response
    // https://github.com/cypress-io/cypress/issues/16973
    if (this.incomingRes.statusMessage) {
        this.res.statusMessage = this.incomingRes.statusMessage;
    }
    this.next();
};
const ClearCyInitialCookie = function () {
    setInitialCookie(this.res, this.remoteStates.current(), false);
    this.next();
};
const MaybeEndWithEmptyBody = function () {
    var _a;
    if (network_1.httpUtils.responseMustHaveEmptyBody(this.req, this.incomingRes)) {
        if (this.protocolManager && ((_a = this.req.browserPreRequest) === null || _a === void 0 ? void 0 : _a.requestId)) {
            const requestId = getOriginalRequestId(this.req.browserPreRequest.requestId);
            this.protocolManager.responseEndedWithEmptyBody({
                requestId,
                isCached: this.incomingRes.statusCode === 304,
                timings: {
                    cdpRequestWillBeSentTimestamp: this.req.browserPreRequest.cdpRequestWillBeSentTimestamp,
                    cdpRequestWillBeSentReceivedTimestamp: this.req.browserPreRequest.cdpRequestWillBeSentReceivedTimestamp,
                    proxyRequestReceivedTimestamp: this.req.browserPreRequest.proxyRequestReceivedTimestamp,
                    cdpLagDuration: this.req.browserPreRequest.cdpLagDuration,
                    proxyRequestCorrelationDuration: this.req.browserPreRequest.proxyRequestCorrelationDuration,
                },
            });
        }
        this.res.end();
        return this.end();
    }
    this.next();
};
const MaybeInjectHtml = function () {
    const span = telemetry_1.telemetry.startSpan({ name: 'maybe:inject:html', parentSpan: this.resMiddlewareSpan, isVerbose: _1.isVerboseTelemetry });
    span === null || span === void 0 ? void 0 : span.setAttributes({
        wantsInjection: this.res.wantsInjection,
    });
    if (!this.res.wantsInjection) {
        span === null || span === void 0 ? void 0 : span.end();
        return this.next();
    }
    this.skipMiddleware('MaybeRemoveSecurity'); // we only want to do one or the other
    this.debug('injecting into HTML');
    this.makeResStreamPlainText();
    const streamSpan = telemetry_1.telemetry.startSpan({ name: `maybe:inject:html-resp:stream`, parentSpan: span, isVerbose: _1.isVerboseTelemetry });
    this.incomingResStream.pipe((0, network_1.concatStream)(async (body) => {
        const nodeCharset = getNodeCharsetFromResponse(this.incomingRes.headers, body, this.debug);
        const decodedBody = iconv_lite_1.default.decode(body, nodeCharset);
        const injectedBody = await rewriter.html(decodedBody, {
            cspNonce: this.res.injectionNonce,
            domainName: network_1.cors.getDomainNameFromUrl(this.req.proxiedUrl),
            wantsInjection: this.res.wantsInjection,
            wantsSecurityRemoved: this.res.wantsSecurityRemoved,
            isNotJavascript: !resContentTypeIsJavaScript(this.incomingRes),
            useAstSourceRewriting: this.config.experimentalSourceRewriting,
            modifyObstructiveThirdPartyCode: this.config.experimentalModifyObstructiveThirdPartyCode && !this.remoteStates.isPrimarySuperDomainOrigin(this.req.proxiedUrl),
            shouldInjectDocumentDomain: network_1.cors.shouldInjectDocumentDomain(this.req.proxiedUrl, {
                skipDomainInjectionForDomains: this.config.experimentalSkipDomainInjection,
            }),
            modifyObstructiveCode: this.config.modifyObstructiveCode,
            url: this.req.proxiedUrl,
            deferSourceMapRewrite: this.deferSourceMapRewrite,
            simulatedCookies: this.simulatedCookies,
        });
        const encodedBody = iconv_lite_1.default.encode(injectedBody, nodeCharset);
        const pt = new stream_1.PassThrough;
        pt.write(encodedBody);
        pt.end();
        this.incomingResStream = pt;
        streamSpan === null || streamSpan === void 0 ? void 0 : streamSpan.end();
        this.next();
    })).on('error', this.onError).once('close', () => {
        span === null || span === void 0 ? void 0 : span.end();
    });
};
const MaybeRemoveSecurity = function () {
    const span = telemetry_1.telemetry.startSpan({ name: 'maybe:remove:security', parentSpan: this.resMiddlewareSpan, isVerbose: _1.isVerboseTelemetry });
    span === null || span === void 0 ? void 0 : span.setAttributes({
        wantsSecurityRemoved: this.res.wantsSecurityRemoved || false,
    });
    if (!this.res.wantsSecurityRemoved) {
        span === null || span === void 0 ? void 0 : span.end();
        return this.next();
    }
    this.debug('removing JS framebusting code');
    this.makeResStreamPlainText();
    this.incomingResStream.setEncoding('utf8');
    const streamSpan = telemetry_1.telemetry.startSpan({ name: `maybe:remove:security-resp:stream`, parentSpan: span, isVerbose: _1.isVerboseTelemetry });
    this.incomingResStream = this.incomingResStream.pipe(rewriter.security({
        isNotJavascript: !resContentTypeIsJavaScript(this.incomingRes),
        useAstSourceRewriting: this.config.experimentalSourceRewriting,
        modifyObstructiveThirdPartyCode: this.config.experimentalModifyObstructiveThirdPartyCode && !this.remoteStates.isPrimarySuperDomainOrigin(this.req.proxiedUrl),
        modifyObstructiveCode: this.config.modifyObstructiveCode,
        url: this.req.proxiedUrl,
        deferSourceMapRewrite: this.deferSourceMapRewrite,
    })).on('error', this.onError).once('close', () => {
        streamSpan === null || streamSpan === void 0 ? void 0 : streamSpan.end();
    });
    span === null || span === void 0 ? void 0 : span.end();
    this.next();
};
const GzipBody = async function () {
    var _a;
    if (this.protocolManager && ((_a = this.req.browserPreRequest) === null || _a === void 0 ? void 0 : _a.requestId)) {
        const preRequest = this.req.browserPreRequest;
        const requestId = getOriginalRequestId(preRequest.requestId);
        const span = telemetry_1.telemetry.startSpan({ name: 'gzip:body:protocol-notification', parentSpan: this.resMiddlewareSpan, isVerbose: _1.isVerboseTelemetry });
        const resultingStream = this.protocolManager.responseStreamReceived({
            requestId,
            responseHeaders: this.incomingRes.headers,
            isAlreadyGunzipped: this.isGunzipped,
            responseStream: this.incomingResStream,
            res: this.res,
            timings: {
                cdpRequestWillBeSentTimestamp: preRequest.cdpRequestWillBeSentTimestamp,
                cdpRequestWillBeSentReceivedTimestamp: preRequest.cdpRequestWillBeSentReceivedTimestamp,
                proxyRequestReceivedTimestamp: preRequest.proxyRequestReceivedTimestamp,
                cdpLagDuration: preRequest.cdpLagDuration,
                proxyRequestCorrelationDuration: preRequest.proxyRequestCorrelationDuration,
            },
        });
        if (resultingStream) {
            this.incomingResStream = resultingStream.on('error', this.onError).once('close', () => {
                span === null || span === void 0 ? void 0 : span.end();
            });
        }
        else {
            span === null || span === void 0 ? void 0 : span.end();
        }
    }
    if (this.isGunzipped) {
        this.debug('regzipping response body');
        const span = telemetry_1.telemetry.startSpan({ name: 'gzip:body', parentSpan: this.resMiddlewareSpan, isVerbose: _1.isVerboseTelemetry });
        this.incomingResStream = this.incomingResStream
            .pipe(zlib_1.default.createGzip(zlibOptions))
            .on('error', this.onError)
            .once('close', () => {
            span === null || span === void 0 ? void 0 : span.end();
        });
    }
    this.next();
};
const SendResponseBodyToClient = function () {
    if (this.req.isAUTFrame) {
        // track the previous AUT request URL so we know if the next requests
        // is cross-origin
        this.setAUTUrl(this.req.proxiedUrl);
    }
    this.incomingResStream.pipe(this.res).on('error', this.onError);
    this.res.once('finish', () => {
        this.end();
    });
};
exports.default = {
    LogResponse,
    FilterNonProxiedResponse,
    AttachPlainTextStreamFn,
    InterceptResponse: net_stubbing_1.InterceptResponse,
    PatchExpressSetHeader,
    OmitProblematicHeaders, // Since we might modify CSP headers, this middleware needs to come BEFORE SetInjectionLevel
    SetInjectionLevel,
    MaybePreventCaching,
    MaybeStripDocumentDomainFeaturePolicy,
    MaybeCopyCookiesFromIncomingRes,
    MaybeSendRedirectToClient,
    CopyResponseStatusCode,
    ClearCyInitialCookie,
    MaybeEndWithEmptyBody,
    MaybeInjectHtml,
    MaybeRemoveSecurity,
    GzipBody,
    SendResponseBodyToClient,
};
