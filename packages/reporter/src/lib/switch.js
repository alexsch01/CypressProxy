"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const mobx_1 = require("mobx");
const mobx_react_1 = require("mobx-react");
const react_1 = tslib_1.__importStar(require("react"));
let Switch = class Switch extends react_1.Component {
    constructor() {
        super(...arguments);
        this._onClick = (e) => {
            const { onUpdate } = this.props;
            onUpdate(e);
        };
    }
    render() {
        const { 'data-cy': dataCy, size = 'lg', value } = this.props;
        return (react_1.default.createElement("button", { "data-cy": dataCy, className: `switch switch-${size}`, role: "switch", "aria-checked": value, onClick: this._onClick },
            react_1.default.createElement("span", { className: "indicator" })));
    }
};
tslib_1.__decorate([
    mobx_1.action
], Switch.prototype, "_onClick", void 0);
Switch = tslib_1.__decorate([
    mobx_react_1.observer
], Switch);
exports.default = Switch;
