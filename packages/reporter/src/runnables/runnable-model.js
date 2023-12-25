"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const mobx_1 = require("mobx");
class Runnable {
    constructor(props, level) {
        this.hooks = [];
        this.id = props.id;
        this.title = props.title;
        this.level = level;
        this.hooks = props.hooks;
    }
}
exports.default = Runnable;
tslib_1.__decorate([
    mobx_1.observable
], Runnable.prototype, "id", void 0);
tslib_1.__decorate([
    mobx_1.observable
], Runnable.prototype, "title", void 0);
tslib_1.__decorate([
    mobx_1.observable
], Runnable.prototype, "level", void 0);
tslib_1.__decorate([
    mobx_1.observable
], Runnable.prototype, "hooks", void 0);
