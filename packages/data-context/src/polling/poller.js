"use strict";
var _Poller_instances, _Poller_timeout, _Poller_isPolling, _Poller_subscriptionId, _Poller_subscriptions, _Poller_poll, _Poller_stop;
Object.defineProperty(exports, "__esModule", { value: true });
exports.Poller = void 0;
const tslib_1 = require("tslib");
const debug_1 = tslib_1.__importDefault(require("debug"));
const debug = (0, debug_1.default)('cypress:data-context:polling:Poller');
class Poller {
    constructor(ctx, event, pollingInterval, callback) {
        _Poller_instances.add(this);
        this.ctx = ctx;
        this.event = event;
        this.pollingInterval = pollingInterval;
        this.callback = callback;
        _Poller_timeout.set(this, void 0);
        _Poller_isPolling.set(this, false);
        _Poller_subscriptionId.set(this, 0);
        _Poller_subscriptions.set(this, {});
    }
    get subscriptions() {
        return Object.values(tslib_1.__classPrivateFieldGet(this, _Poller_subscriptions, "f"));
    }
    set interval(interval) {
        debug(`interval for ${this.event} set to ${interval}`);
        this.pollingInterval = interval;
    }
    start(config = {}) {
        var _a;
        const subscriptionId = tslib_1.__classPrivateFieldSet(this, _Poller_subscriptionId, (_a = tslib_1.__classPrivateFieldGet(this, _Poller_subscriptionId, "f"), ++_a), "f");
        debug(`subscribing to ${this.event} with initial value %o and meta %o`, config === null || config === void 0 ? void 0 : config.initialValue, config === null || config === void 0 ? void 0 : config.meta);
        tslib_1.__classPrivateFieldGet(this, _Poller_subscriptions, "f")[subscriptionId] = { meta: config.meta };
        debug('subscriptions after subscribe', tslib_1.__classPrivateFieldGet(this, _Poller_subscriptions, "f"));
        if (!tslib_1.__classPrivateFieldGet(this, _Poller_isPolling, "f")) {
            tslib_1.__classPrivateFieldSet(this, _Poller_isPolling, true, "f");
            debug(`starting poller for ${this.event}`);
            tslib_1.__classPrivateFieldGet(this, _Poller_instances, "m", _Poller_poll).call(this).catch((e) => {
                debug('error executing poller %o', e);
            });
        }
        return this.ctx.emitter.subscribeTo(this.event, {
            sendInitial: false,
            initialValue: config.initialValue,
            filter: config.filter,
            onUnsubscribe: (listenerCount) => {
                debug(`onUnsubscribe for ${this.event}`);
                delete tslib_1.__classPrivateFieldGet(this, _Poller_subscriptions, "f")[subscriptionId];
                if (listenerCount === 0) {
                    debug(`listener count is 0 for ${this.event}`);
                    tslib_1.__classPrivateFieldGet(this, _Poller_instances, "m", _Poller_stop).call(this);
                }
            },
        });
    }
}
exports.Poller = Poller;
_Poller_timeout = new WeakMap(), _Poller_isPolling = new WeakMap(), _Poller_subscriptionId = new WeakMap(), _Poller_subscriptions = new WeakMap(), _Poller_instances = new WeakSet(), _Poller_poll = async function _Poller_poll() {
    debug(`polling for ${this.event}`);
    if (!tslib_1.__classPrivateFieldGet(this, _Poller_isPolling, "f")) {
        debug('terminating poll after being stopped');
        return;
    }
    debug(`calling poll callback for ${this.event}`);
    await this.callback(this.subscriptions);
    if (!tslib_1.__classPrivateFieldGet(this, _Poller_isPolling, "f")) {
        debug('poller terminated during callback');
        return;
    }
    debug(`setting timeout with interval of ${this.pollingInterval} second`);
    tslib_1.__classPrivateFieldSet(this, _Poller_timeout, setTimeout(async () => {
        tslib_1.__classPrivateFieldSet(this, _Poller_timeout, undefined, "f");
        await tslib_1.__classPrivateFieldGet(this, _Poller_instances, "m", _Poller_poll).call(this);
    }, this.pollingInterval * 1000), "f");
}, _Poller_stop = function _Poller_stop() {
    debug(`stopping poller for ${this.event}`, !!tslib_1.__classPrivateFieldGet(this, _Poller_timeout, "f"));
    if (tslib_1.__classPrivateFieldGet(this, _Poller_timeout, "f")) {
        clearTimeout(tslib_1.__classPrivateFieldGet(this, _Poller_timeout, "f"));
        tslib_1.__classPrivateFieldSet(this, _Poller_timeout, undefined, "f");
    }
    tslib_1.__classPrivateFieldSet(this, _Poller_isPolling, false, "f");
};
