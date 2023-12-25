"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const mobx_1 = require("mobx");
const instrument_model_1 = tslib_1.__importDefault(require("../instruments/instrument-model"));
class Route extends instrument_model_1.default {
    constructor(props) {
        super(props);
        this.numResponses = 0;
        this.isStubbed = props.isStubbed;
        this.method = props.method;
        this.numResponses = props.numResponses;
        this.url = props.url;
    }
    update(props) {
        super.update(props);
        this.isStubbed = props.isStubbed;
        this.method = props.method;
        this.numResponses = props.numResponses;
        this.url = props.url;
    }
}
exports.default = Route;
tslib_1.__decorate([
    mobx_1.observable
], Route.prototype, "isStubbed", void 0);
tslib_1.__decorate([
    mobx_1.observable
], Route.prototype, "method", void 0);
tslib_1.__decorate([
    mobx_1.observable
], Route.prototype, "numResponses", void 0);
tslib_1.__decorate([
    mobx_1.observable
], Route.prototype, "url", void 0);
