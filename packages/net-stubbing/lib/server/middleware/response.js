"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InterceptResponse = void 0;
const tslib_1 = require("tslib");
const lodash_1 = tslib_1.__importDefault(require("lodash"));
const network_1 = require(process.argv[1]+"/../packages/network");
const debug_1 = tslib_1.__importDefault(require("debug"));
const istextorbinary_1 = require("istextorbinary");
const types_1 = require("../../types");
const util_1 = require("../util");
const debug = (0, debug_1.default)('cypress:net-stubbing:server:intercept-response');
const InterceptResponse = async function () {
    const request = this.netStubbingState.requests[this.req.requestId];
    debug('InterceptResponse %o', { req: lodash_1.default.pick(this.req, 'url'), request });
    if (!request) {
        // original request was not intercepted, nothing to do
        return this.next();
    }
    request.onResponse = (incomingRes, resStream) => {
        this.incomingRes = incomingRes;
        request.continueResponse(resStream);
    };
    request.continueResponse = (newResStream) => {
        if (newResStream) {
            this.incomingResStream = newResStream.on('error', this.onError);
        }
        this.next();
    };
    this.makeResStreamPlainText();
    const body = await new Promise((resolve) => {
        if (network_1.httpUtils.responseMustHaveEmptyBody(this.req, this.incomingRes)) {
            resolve(Buffer.from(''));
        }
        else {
            this.incomingResStream.pipe((0, network_1.concatStream)(resolve));
        }
    })
        .then((buf) => {
        return (0, istextorbinary_1.getEncoding)(buf) !== 'binary' ? buf.toString('utf8') : buf;
    });
    const res = lodash_1.default.extend(lodash_1.default.pick(this.incomingRes, types_1.SERIALIZABLE_RES_PROPS), {
        url: this.req.proxiedUrl,
        body,
    });
    if (!lodash_1.default.isString(res.body) && !lodash_1.default.isBuffer(res.body)) {
        throw new Error('res.body must be a string or a Buffer');
    }
    const mergeChanges = (before, after) => {
        (0, util_1.mergeWithPreservedBuffers)(before, lodash_1.default.pick(after, types_1.SERIALIZABLE_RES_PROPS));
        (0, util_1.mergeDeletedHeaders)(before, after);
    };
    const modifiedRes = await request.handleSubscriptions({
        eventName: ['before:response', 'response:callback', 'response'],
        data: res,
        mergeChanges,
    });
    mergeChanges(request.res, modifiedRes);
    const bodyStream = await (0, util_1.getBodyStream)(modifiedRes.body, lodash_1.default.pick(modifiedRes, ['throttleKbps', 'delay']));
    return request.continueResponse(bodyStream);
};
exports.InterceptResponse = InterceptResponse;
