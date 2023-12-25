"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onNetStubbingEvent = exports._restoreMatcherOptionsTypes = void 0;
const tslib_1 = require("tslib");
const lodash_1 = tslib_1.__importDefault(require("lodash"));
const debug_1 = tslib_1.__importDefault(require("debug"));
const types_1 = require("../types");
const util_1 = require("./util");
const intercepted_request_1 = require("./intercepted-request");
const debug = (0, debug_1.default)('cypress:net-stubbing:server:driver-events');
async function onRouteAdded(state, getFixture, options) {
    const routeMatcher = _restoreMatcherOptionsTypes(options.routeMatcher);
    const { staticResponse } = options;
    if (staticResponse) {
        await (0, util_1.setResponseFromFixture)(getFixture, staticResponse);
    }
    const route = {
        id: options.routeId,
        hasInterceptor: options.hasInterceptor,
        staticResponse: options.staticResponse,
        routeMatcher,
        getFixture,
        matches: 0,
    };
    state.routes.push(route);
}
function getRequest(state, requestId) {
    return Object.values(state.requests).find(({ id }) => {
        return requestId === id;
    });
}
function subscribe(state, options) {
    const request = getRequest(state, options.requestId);
    if (!request) {
        return;
    }
    request.addSubscription(options.subscription);
}
async function sendStaticResponse(state, getFixture, options) {
    const request = getRequest(state, options.requestId);
    if (!request) {
        return;
    }
    if (options.staticResponse.fixture && ['before:response', 'response:callback', 'response'].includes(request.lastEvent)) {
        // if we're already in a response phase, it's possible that the fixture body will never be sent to the browser
        // so include the fixture body in `after:response`
        request.includeBodyInAfterResponse = true;
    }
    await (0, util_1.setResponseFromFixture)(getFixture, options.staticResponse);
    await (0, util_1.sendStaticResponse)(request, options.staticResponse);
}
function _restoreMatcherOptionsTypes(options) {
    const stringMatcherFields = (0, util_1.getAllStringMatcherFields)(options);
    const ret = {};
    stringMatcherFields.forEach((field) => {
        const obj = lodash_1.default.get(options, field);
        if (!obj) {
            return;
        }
        let { value, type } = obj;
        if (type === 'regex') {
            const lastSlashI = value.lastIndexOf('/');
            const flags = value.slice(lastSlashI + 1);
            const pattern = value.slice(1, lastSlashI);
            value = new RegExp(pattern, flags);
        }
        lodash_1.default.set(ret, field, value);
    });
    lodash_1.default.extend(ret, lodash_1.default.pick(options, types_1.PLAIN_FIELDS));
    return ret;
}
exports._restoreMatcherOptionsTypes = _restoreMatcherOptionsTypes;
async function onNetStubbingEvent(opts) {
    const { state, getFixture, args, eventName, frame } = opts;
    debug('received driver event %o', { eventName, args });
    switch (eventName) {
        case 'route:added':
            return onRouteAdded(state, getFixture, frame);
        case 'subscribe':
            return subscribe(state, frame);
        case 'event:handler:resolved':
            return intercepted_request_1.InterceptedRequest.resolveEventHandler(state, frame);
        case 'send:static:response':
            return sendStaticResponse(state, getFixture, frame);
        default:
            throw new Error(`Unrecognized net event: ${eventName}`);
    }
}
exports.onNetStubbingEvent = onNetStubbingEvent;
