"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const lodash_1 = tslib_1.__importDefault(require("lodash"));
const mobx_1 = require("mobx");
const runnable_model_1 = tslib_1.__importDefault(require("./runnable-model"));
class Suite extends runnable_model_1.default {
    constructor() {
        super(...arguments);
        this.children = [];
        this.type = 'suite';
    }
    get state() {
        if (this._anyChildrenFailed) {
            return 'failed';
        }
        if (this._allChildrenPending) {
            return 'pending';
        }
        if (this._allChildrenPassedOrPending) {
            return 'passed';
        }
        return 'processing';
    }
    get _childStates() {
        return lodash_1.default.map(this.children, 'state');
    }
    get hasRetried() {
        return lodash_1.default.some(this.children, (v) => v.hasRetried);
    }
    get _anyChildrenFailed() {
        return lodash_1.default.some(this._childStates, (state) => {
            return state === 'failed';
        });
    }
    get _allChildrenPassedOrPending() {
        return !this._childStates.length || lodash_1.default.every(this._childStates, (state) => {
            return state === 'passed' || state === 'pending';
        });
    }
    get _allChildrenPending() {
        return !!this._childStates.length
            && lodash_1.default.every(this._childStates, (state) => {
                return state === 'pending';
            });
    }
}
exports.default = Suite;
tslib_1.__decorate([
    mobx_1.observable
], Suite.prototype, "children", void 0);
tslib_1.__decorate([
    mobx_1.computed
], Suite.prototype, "state", null);
tslib_1.__decorate([
    mobx_1.computed
], Suite.prototype, "_childStates", null);
tslib_1.__decorate([
    mobx_1.computed
], Suite.prototype, "hasRetried", null);
tslib_1.__decorate([
    mobx_1.computed
], Suite.prototype, "_anyChildrenFailed", null);
tslib_1.__decorate([
    mobx_1.computed
], Suite.prototype, "_allChildrenPassedOrPending", null);
tslib_1.__decorate([
    mobx_1.computed
], Suite.prototype, "_allChildrenPending", null);
