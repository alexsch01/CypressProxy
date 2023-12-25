"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DestroyResponse = exports.UnpipeResponse = exports.AbortRequest = void 0;
const tslib_1 = require("tslib");
const errors = tslib_1.__importStar(require(process.argv[1]+"/../packages/server/lib/errors"));
const net_stubbing_1 = require(process.argv[1]+"/../packages/net-stubbing");
// do not use a debug namespace in this file - use the per-request `this.debug` instead
// available as cypress-verbose:proxy:http
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const debug = null;
const LogError = function () {
    this.debug('error proxying request %o', {
        error: this.error,
        url: this.req.url,
        headers: this.req.headers,
    });
    this.next();
};
const SendToDriver = function () {
    if (this.req.browserPreRequest) {
        this.socket.toDriver('request:event', 'request:error', {
            requestId: this.req.browserPreRequest.requestId,
            error: errors.cloneErr(this.error),
        });
    }
    this.next();
};
const AbortRequest = function () {
    if (this.outgoingReq) {
        this.debug('aborting outgoingReq');
        this.outgoingReq.abort();
    }
    this.next();
};
exports.AbortRequest = AbortRequest;
const UnpipeResponse = function () {
    if (this.incomingResStream) {
        this.debug('unpiping resStream from response');
        this.incomingResStream.unpipe();
    }
    this.next();
};
exports.UnpipeResponse = UnpipeResponse;
const DestroyResponse = function () {
    this.res.destroy();
    this.end();
};
exports.DestroyResponse = DestroyResponse;
exports.default = {
    LogError,
    SendToDriver,
    InterceptError: net_stubbing_1.InterceptError,
    AbortRequest: exports.AbortRequest,
    UnpipeResponse: exports.UnpipeResponse,
    DestroyResponse: exports.DestroyResponse,
};
