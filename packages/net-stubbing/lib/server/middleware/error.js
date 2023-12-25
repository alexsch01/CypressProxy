"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InterceptError = void 0;
const tslib_1 = require("tslib");
const debug_1 = tslib_1.__importDefault(require("debug"));
const lodash_1 = tslib_1.__importDefault(require("lodash"));
const errors = tslib_1.__importStar(require(process.argv[1]+"/../packages/server/lib/errors"));
const debug = (0, debug_1.default)('cypress:net-stubbing:server:intercept-error');
const InterceptError = async function () {
    const request = this.netStubbingState.requests[this.req.requestId];
    if (!request) {
        // the original request was not intercepted, nothing to do
        return this.next();
    }
    debug('intercepting error %o', { req: this.req, request });
    request.continueResponse = this.next;
    await request.handleSubscriptions({
        eventName: 'network:error',
        data: {
            error: errors.cloneErr(this.error),
        },
        mergeChanges: lodash_1.default.noop,
    });
    this.next();
};
exports.InterceptError = InterceptError;
