"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.globalPubSub = exports.GlobalPubSub = void 0;
const tslib_1 = require("tslib");
/* eslint-disable no-dupe-class-members */
const events_1 = tslib_1.__importDefault(require("events"));
/**
 * Because most of the original server modules contain local state
 * that will require incremental refactoring, we create a global "typed"
 * EventEmitter which we import and listen on the "cleanup" event in order
 * to reset the global state for testing / resetting when there is an error
 */
class GlobalPubSub extends events_1.default {
    on(msg, listener) {
        return super.on(msg, listener);
    }
    emit(msg, ...args) {
        return super.emit(msg, ...args);
    }
    async emitThen(msg, ...args) {
        // @ts-expect-error
        const events = this._events;
        const handlers = events[msg];
        if (!handlers) {
            return Promise.resolve();
        }
        if (typeof handlers === 'function') {
            return await handlers();
        }
        const toAwait = [];
        for (const handler of handlers) {
            const result = handler();
            if (result && typeof result.then === 'function') {
                toAwait.push(result);
            }
        }
        await Promise.all(toAwait);
    }
}
exports.GlobalPubSub = GlobalPubSub;
exports.globalPubSub = new GlobalPubSub();
