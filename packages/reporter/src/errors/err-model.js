"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
/* eslint-disable padding-line-between-statements */
const lodash_1 = tslib_1.__importDefault(require("lodash"));
const mobx_1 = require("mobx");
class Err {
    constructor(props) {
        this.name = '';
        this.message = '';
        this.stack = '';
        this.parsedStack = null;
        this.docsUrl = '';
        this.templateType = '';
        this.isRecovered = false;
        this.update(props);
    }
    get displayMessage() {
        return lodash_1.default.compact([this.name, this.message]).join(': ');
    }
    get isCommandErr() {
        return /(AssertionError|CypressError)/.test(this.name);
    }
    update(props) {
        if (!props)
            return;
        if (props.name)
            this.name = props.name;
        if (props.message)
            this.message = props.message;
        if (props.stack)
            this.stack = props.stack;
        if (props.docsUrl)
            this.docsUrl = props.docsUrl;
        if (props.parsedStack)
            this.parsedStack = props.parsedStack;
        if (props.templateType)
            this.templateType = props.templateType;
        if (props.codeFrame)
            this.codeFrame = props.codeFrame;
        this.isRecovered = !!props.isRecovered;
    }
}
exports.default = Err;
tslib_1.__decorate([
    mobx_1.observable
], Err.prototype, "name", void 0);
tslib_1.__decorate([
    mobx_1.observable
], Err.prototype, "message", void 0);
tslib_1.__decorate([
    mobx_1.observable
], Err.prototype, "stack", void 0);
tslib_1.__decorate([
    mobx_1.observable.ref
], Err.prototype, "parsedStack", void 0);
tslib_1.__decorate([
    mobx_1.observable
], Err.prototype, "docsUrl", void 0);
tslib_1.__decorate([
    mobx_1.observable
], Err.prototype, "templateType", void 0);
tslib_1.__decorate([
    mobx_1.observable.ref
], Err.prototype, "codeFrame", void 0);
tslib_1.__decorate([
    mobx_1.observable
], Err.prototype, "isRecovered", void 0);
tslib_1.__decorate([
    mobx_1.computed
], Err.prototype, "displayMessage", null);
tslib_1.__decorate([
    mobx_1.computed
], Err.prototype, "isCommandErr", null);
