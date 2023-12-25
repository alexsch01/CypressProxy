"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventRegistrar = void 0;
const tslib_1 = require("tslib");
const debug_1 = tslib_1.__importDefault(require("debug"));
const lodash_1 = tslib_1.__importDefault(require("lodash"));
const debug = (0, debug_1.default)(`cypress:lifecycle:EventRegistrar`);
class EventRegistrar {
    constructor() {
        this._registeredEvents = {};
    }
    hasNodeEvent(eventName) {
        const isRegistered = typeof this._registeredEvents[eventName] === 'function';
        debug('plugin event registered? %o', { eventName, isRegistered });
        return isRegistered;
    }
    executeNodeEvent(event, args) {
        debug(`execute plugin event '${event}' Node '${process.version}' with args: %o %o %o`, ...args);
        const evtFn = this._registeredEvents[event];
        if (typeof evtFn !== 'function') {
            throw new Error(`Missing event for ${event}`);
        }
        return evtFn(...args);
    }
    registerEvent(event, callback) {
        debug(`register event '${event}'`);
        if (!lodash_1.default.isString(event)) {
            throw new Error(`The plugin register function must be called with an event as its 1st argument. You passed '${event}'.`);
        }
        if (!lodash_1.default.isFunction(callback)) {
            throw new Error(`The plugin register function must be called with a callback function as its 2nd argument. You passed '${callback}'.`);
        }
        this._registeredEvents[event] = callback;
    }
    reset() {
        this._registeredEvents = {};
    }
}
exports.EventRegistrar = EventRegistrar;
