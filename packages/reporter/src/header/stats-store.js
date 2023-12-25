"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StatsStore = void 0;
const tslib_1 = require("tslib");
const lodash_1 = tslib_1.__importDefault(require("lodash"));
const mobx_1 = require("mobx");
const defaults = {
    numPassed: 0,
    numFailed: 0,
    numPending: 0,
    _startTime: null,
    _currentTime: null,
};
class StatsStore {
    constructor() {
        this.numPassed = defaults.numPassed;
        this.numFailed = defaults.numFailed;
        this.numPending = defaults.numPending;
        this._startTime = defaults._startTime;
        this._currentTime = defaults._startTime;
    }
    get duration() {
        if (!this._startTime)
            return 0;
        if (!this._currentTime) {
            throw new Error('StatsStore should be initialized with start() method.');
        }
        return this._currentTime - this._startTime;
    }
    start({ startTime, numPassed = 0, numFailed = 0, numPending = 0 }) {
        if (this._startTime)
            return;
        this.numPassed = numPassed;
        this.numFailed = numFailed;
        this.numPending = numPending;
        this._startTime = new Date(startTime).getTime();
        this._updateCurrentTime();
        this._startTimer();
    }
    _startTimer() {
        this._interval = setInterval((0, mobx_1.action)('duration:interval', this._updateCurrentTime.bind(this)), 100);
    }
    _stopTimer() {
        clearInterval(this._interval);
    }
    _updateCurrentTime() {
        this._currentTime = Date.now();
    }
    incrementCount(type) {
        const countKey = `num${lodash_1.default.capitalize(type)}`;
        this[countKey] = this[countKey] + 1;
    }
    pause() {
        this._stopTimer();
    }
    resume() {
        this._startTimer();
    }
    end() {
        this._stopTimer();
        this._updateCurrentTime();
    }
    reset() {
        this._stopTimer();
        lodash_1.default.each(defaults, (value, key) => {
            this[key] = value;
        });
    }
}
exports.StatsStore = StatsStore;
tslib_1.__decorate([
    mobx_1.observable
], StatsStore.prototype, "numPassed", void 0);
tslib_1.__decorate([
    mobx_1.observable
], StatsStore.prototype, "numFailed", void 0);
tslib_1.__decorate([
    mobx_1.observable
], StatsStore.prototype, "numPending", void 0);
tslib_1.__decorate([
    mobx_1.observable
], StatsStore.prototype, "_startTime", void 0);
tslib_1.__decorate([
    mobx_1.observable
], StatsStore.prototype, "_currentTime", void 0);
tslib_1.__decorate([
    mobx_1.computed
], StatsStore.prototype, "duration", null);
tslib_1.__decorate([
    mobx_1.action
], StatsStore.prototype, "incrementCount", null);
exports.default = new StatsStore();
