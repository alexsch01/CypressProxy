"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const lodash_1 = tslib_1.__importDefault(require("lodash"));
const mobx_1 = require("mobx");
const attempt_model_1 = tslib_1.__importDefault(require("../attempts/attempt-model"));
const err_model_1 = tslib_1.__importDefault(require("../errors/err-model"));
const runnable_model_1 = tslib_1.__importDefault(require("../runnables/runnable-model"));
class Test extends runnable_model_1.default {
    constructor(props, level, store) {
        super(props, level);
        this.store = store;
        this.type = 'test';
        this._callbackAfterUpdate = null;
        this.attempts = [];
        this._isOpen = null;
        this.isOpenWhenActive = null;
        this._isFinished = false;
        this.addLog = (props) => {
            var _a;
            // NOTE: The 'testCurrentRetry' prop may be zero, which means we really care about nullish coalescing the value
            // to make sure logs on the first attempt are still accounted for even if the attempt has finished.
            return this._withAttempt((_a = props.testCurrentRetry) !== null && _a !== void 0 ? _a : this.currentRetry, (attempt) => {
                return attempt.addLog(props);
            });
        };
        this._addAttempt = (props) => {
            props.invocationDetails = this.invocationDetails;
            props.hooks = this.hooks;
            const attempt = new attempt_model_1.default(props, this);
            this.attempts.push(attempt);
            return attempt;
        };
        this.invocationDetails = props.invocationDetails;
        this.hooks = [...props.hooks, {
                hookId: props.id.toString(),
                hookName: 'test body',
                invocationDetails: props.invocationDetails,
            }, {
                hookId: `${props.id.toString()}-studio`,
                hookName: 'studio commands',
                isStudio: true,
            }];
        lodash_1.default.each(props.prevAttempts || [], (attempt) => this._addAttempt(attempt));
        this._addAttempt(props);
    }
    get isLongRunning() {
        return lodash_1.default.some(this.attempts, (attempt) => {
            return attempt.isLongRunning;
        });
    }
    get isOpen() {
        if (this._isOpen === null) {
            return Boolean(this.state === 'failed'
                || this.isLongRunning
                || this.isActive && (this.hasMultipleAttempts || this.isOpenWhenActive)
                || this.store.hasSingleTest);
        }
        return this._isOpen;
    }
    get state() {
        // Use the outerStatus of the last attempt to determine overall test status, if present,
        // as the last attempt may have 'passed', but the outerStatus may be marked as failed.
        return this.lastAttempt ? (this.lastAttempt._testOuterStatus || this.lastAttempt.state) : 'active';
    }
    get err() {
        return this.lastAttempt ? this.lastAttempt.err : new err_model_1.default({});
    }
    get lastAttempt() {
        return lodash_1.default.last(this.attempts);
    }
    get hasMultipleAttempts() {
        return this.attempts.length > 1;
    }
    get hasRetried() {
        return this.state === 'passed' && this.hasMultipleAttempts;
    }
    // TODO: make this an enum with states: 'QUEUED, ACTIVE, INACTIVE'
    get isActive() {
        return lodash_1.default.some(this.attempts, { isActive: true });
    }
    get currentRetry() {
        return this.attempts.length - 1;
    }
    isLastAttempt(attemptModel) {
        return this.lastAttempt === attemptModel;
    }
    updateLog(props) {
        var _a;
        this._withAttempt((_a = props.testCurrentRetry) !== null && _a !== void 0 ? _a : this.currentRetry, (attempt) => {
            attempt.updateLog(props);
        });
    }
    removeLog(props) {
        var _a;
        this._withAttempt((_a = props.testCurrentRetry) !== null && _a !== void 0 ? _a : this.currentRetry, (attempt) => {
            attempt.removeLog(props);
        });
    }
    start(props) {
        let attempt = this.getAttemptByIndex(props.currentRetry);
        if (!attempt) {
            attempt = this._addAttempt(props);
        }
        attempt.start();
    }
    update(props, cb) {
        if (this.state === 'processing' && !props.state) {
            cb();
        }
        if (props.isOpen != null) {
            this.setIsOpenWhenActive(props.isOpen);
            if (this.isOpen !== props.isOpen) {
                this._callbackAfterUpdate = cb;
                return;
            }
        }
        if (props.err || props.state) {
            this._withAttempt(this.currentRetry, (attempt) => {
                attempt.update(props);
            });
        }
        cb();
    }
    // this is called to sync up the command log UI for the sake of
    // screenshots, so we only ever need to open the last attempt
    setIsOpenWhenActive(isOpen) {
        this.isOpenWhenActive = isOpen;
    }
    callbackAfterUpdate() {
        if (this._callbackAfterUpdate) {
            this._callbackAfterUpdate();
            this._callbackAfterUpdate = null;
        }
    }
    finish(props, isInteractive) {
        var _a;
        this._isFinished = !(props.retries && props.currentRetry) || props.currentRetry >= props.retries;
        this._withAttempt((_a = props.currentRetry) !== null && _a !== void 0 ? _a : 0, (attempt) => {
            attempt.finish(props, isInteractive);
        });
    }
    getAttemptByIndex(attemptIndex) {
        if (attemptIndex >= this.attempts.length)
            return;
        return this.attempts[attemptIndex || 0];
    }
    commandMatchingErr() {
        return this.lastAttempt.commandMatchingErr();
    }
    _withAttempt(attemptIndex, cb) {
        const attempt = this.getAttemptByIndex(attemptIndex);
        if (attempt)
            return cb(attempt);
        return null;
    }
}
exports.default = Test;
tslib_1.__decorate([
    mobx_1.observable
], Test.prototype, "attempts", void 0);
tslib_1.__decorate([
    mobx_1.observable
], Test.prototype, "_isOpen", void 0);
tslib_1.__decorate([
    mobx_1.observable
], Test.prototype, "isOpenWhenActive", void 0);
tslib_1.__decorate([
    mobx_1.observable
], Test.prototype, "_isFinished", void 0);
tslib_1.__decorate([
    mobx_1.computed
], Test.prototype, "isLongRunning", null);
tslib_1.__decorate([
    mobx_1.computed
], Test.prototype, "isOpen", null);
tslib_1.__decorate([
    mobx_1.computed
], Test.prototype, "state", null);
tslib_1.__decorate([
    mobx_1.computed
], Test.prototype, "err", null);
tslib_1.__decorate([
    mobx_1.computed
], Test.prototype, "lastAttempt", null);
tslib_1.__decorate([
    mobx_1.computed
], Test.prototype, "hasMultipleAttempts", null);
tslib_1.__decorate([
    mobx_1.computed
], Test.prototype, "hasRetried", null);
tslib_1.__decorate([
    mobx_1.computed
], Test.prototype, "isActive", null);
tslib_1.__decorate([
    mobx_1.computed
], Test.prototype, "currentRetry", null);
tslib_1.__decorate([
    mobx_1.action
], Test.prototype, "start", null);
tslib_1.__decorate([
    mobx_1.action
], Test.prototype, "update", null);
tslib_1.__decorate([
    mobx_1.action
], Test.prototype, "finish", null);
