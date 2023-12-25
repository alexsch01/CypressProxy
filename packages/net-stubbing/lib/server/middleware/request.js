"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InterceptRequest = exports.SetMatchingRoutes = void 0;
const tslib_1 = require("tslib");
const lodash_1 = tslib_1.__importDefault(require("lodash"));
const network_1 = require(process.argv[1]+"/../packages/network");
const url_1 = tslib_1.__importDefault(require("url"));
const types_1 = require("../../types");
const route_matching_1 = require("../route-matching");
const util_1 = require("../util");
const intercepted_request_1 = require("../intercepted-request");
const telemetry_1 = require(process.argv[1]+"/../packages/telemetry");
// do not use a debug namespace in this file - use the per-request `this.debug` instead
// available as cypress-verbose:proxy:http
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const debug = null;
const SetMatchingRoutes = async function () {
    const span = telemetry_1.telemetry.startSpan({ name: 'set:matching:routes', parentSpan: this.reqMiddlewareSpan, isVerbose: true });
    const url = new URL(this.req.proxiedUrl);
    // if this is a request to the dev server, do not match any routes as
    // we do not want to allow the user to intercept requests to the dev server
    if (url.pathname.startsWith(this.config.devServerPublicPathRoute)) {
        span === null || span === void 0 ? void 0 : span.end();
        return this.next();
    }
    if ((0, route_matching_1.matchesRoutePreflight)(this.netStubbingState.routes, this.req)) {
        // send positive CORS preflight response
        return (0, util_1.sendStaticResponse)(this, {
            statusCode: 204,
            headers: {
                'access-control-max-age': '-1',
                'access-control-allow-credentials': 'true',
                'access-control-allow-origin': this.req.headers.origin || '*',
                'access-control-allow-methods': this.req.headers['access-control-request-method'] || '*',
                'access-control-allow-headers': this.req.headers['access-control-request-headers'] || '*',
            },
        });
    }
    this.req.matchingRoutes = [...(0, route_matching_1.getRoutesForRequest)(this.netStubbingState.routes, this.req)];
    span === null || span === void 0 ? void 0 : span.end();
    this.next();
};
exports.SetMatchingRoutes = SetMatchingRoutes;
/**
 * Called when a new request is received in the proxy layer.
 */
const InterceptRequest = async function () {
    var _a;
    const span = telemetry_1.telemetry.startSpan({ name: 'intercept:request', parentSpan: this.reqMiddlewareSpan, isVerbose: true });
    if (!((_a = this.req.matchingRoutes) === null || _a === void 0 ? void 0 : _a.length)) {
        // not intercepted, carry on normally...
        span === null || span === void 0 ? void 0 : span.end();
        return this.next();
    }
    const request = new intercepted_request_1.InterceptedRequest({
        continueRequest: this.next,
        onError: this.onError,
        onResponse: (incomingRes, resStream) => {
            (0, util_1.setDefaultHeaders)(this.req, incomingRes);
            this.onResponse(incomingRes, resStream);
        },
        req: this.req,
        res: this.res,
        socket: this.socket,
        state: this.netStubbingState,
    });
    this.debug('cy.intercept: intercepting request');
    // attach requestId to the original req object for later use
    this.req.requestId = request.id;
    this.netStubbingState.requests[request.id] = request;
    const req = lodash_1.default.extend(lodash_1.default.pick(request.req, types_1.SERIALIZABLE_REQ_PROPS), {
        url: request.req.proxiedUrl,
    });
    request.res.once('finish', async () => {
        request.handleSubscriptions({
            eventName: 'after:response',
            data: request.includeBodyInAfterResponse ? {
                finalResBody: request.res.body,
            } : {},
            mergeChanges: lodash_1.default.noop,
        });
        this.debug('cy.intercept: request/response finished, cleaning up');
        delete this.netStubbingState.requests[request.id];
    });
    const ensureBody = () => {
        return new Promise((resolve) => {
            if (req.body) {
                return resolve();
            }
            const onClose = () => {
                req.body = '';
                return resolve();
            };
            // If the response has been destroyed we won't be able to get the body from the stream.
            if (request.res.destroyed) {
                onClose();
            }
            // Also listen the response close in case it happens while we are piping the request stream.
            request.res.once('close', onClose);
            request.req.pipe((0, network_1.concatStream)((reqBody) => {
                req.body = reqBody;
                request.res.off('close', onClose);
                resolve();
            }));
        });
    };
    await ensureBody();
    if (!lodash_1.default.isString(req.body) && !lodash_1.default.isBuffer(req.body)) {
        throw new Error('req.body must be a string or a Buffer');
    }
    const bodyEncoding = (0, util_1.getBodyEncoding)(req);
    const bodyIsBinary = bodyEncoding === 'binary';
    if (bodyIsBinary) {
        this.debug('cy.intercept: req.body contained non-utf8 characters, treating as binary content');
    }
    // leave the requests that send a binary buffer unchanged
    // but we can work with the "normal" string requests
    if (!bodyIsBinary) {
        req.body = req.body.toString('utf8');
    }
    request.req.body = req.body;
    const mergeChanges = (before, after) => {
        if ('content-length' in before.headers && before.headers['content-length'] === after.headers['content-length']) {
            // user did not purposely override content-length, let's set it
            after.headers['content-length'] = String(Buffer.from(after.body).byteLength);
        }
        // resolve and propagate any changes to the URL
        request.req.proxiedUrl = after.url = url_1.default.resolve(request.req.proxiedUrl, after.url);
        (0, util_1.mergeWithPreservedBuffers)(before, lodash_1.default.pick(after, types_1.SERIALIZABLE_REQ_PROPS));
        (0, util_1.mergeDeletedHeaders)(before, after);
    };
    const modifiedReq = await request.handleSubscriptions({
        eventName: 'before:request',
        data: req,
        mergeChanges,
    });
    mergeChanges(req, modifiedReq);
    // @ts-ignore
    mergeChanges(request.req, req);
    if (request.responseSent) {
        // request has been fulfilled with a response already, do not send the request outgoing
        // @see https://github.com/cypress-io/cypress/issues/15841
        span === null || span === void 0 ? void 0 : span.end();
        return this.end();
    }
    span === null || span === void 0 ? void 0 : span.end();
    return request.continueRequest();
};
exports.InterceptRequest = InterceptRequest;
