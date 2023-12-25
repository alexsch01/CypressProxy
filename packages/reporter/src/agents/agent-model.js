"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const mobx_1 = require("mobx");
const instrument_model_1 = tslib_1.__importDefault(require("../instruments/instrument-model"));
class Agent extends instrument_model_1.default {
    constructor(props) {
        super(props);
        this.callCount = 0;
        this.callCount = props.callCount;
        this.functionName = props.functionName;
    }
    update(props) {
        super.update(props);
        this.callCount = props.callCount;
        this.functionName = props.functionName;
    }
}
exports.default = Agent;
tslib_1.__decorate([
    mobx_1.observable
], Agent.prototype, "callCount", void 0);
tslib_1.__decorate([
    mobx_1.observable
], Agent.prototype, "functionName", void 0);
