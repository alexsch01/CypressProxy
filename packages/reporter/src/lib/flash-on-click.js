"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const mobx_1 = require("mobx");
const mobx_react_1 = require("mobx-react");
const prop_types_1 = tslib_1.__importDefault(require("prop-types"));
const react_1 = tslib_1.__importStar(require("react"));
// @ts-ignore
const react_tooltip_1 = tslib_1.__importDefault(require("@cypress/react-tooltip"));
let FlashOnClick = class FlashOnClick extends react_1.Component {
    constructor() {
        super(...arguments);
        this._show = false;
        this._onClick = (e) => {
            const { onClick, shouldShowMessage } = this.props;
            onClick(e);
            if (shouldShowMessage && !shouldShowMessage())
                return;
            this._show = true;
            setTimeout((0, mobx_1.action)('hide:console:message', () => {
                this._show = false;
            }), 1500);
        };
    }
    render() {
        const child = react_1.Children.only(this.props.children);
        return (react_1.default.createElement(react_tooltip_1.default, { placement: 'top', title: this.props.message, visible: this._show, className: 'cy-tooltip', wrapperClassName: this.props.wrapperClassName }, (0, react_1.cloneElement)(child, { onClick: this._onClick })));
    }
};
FlashOnClick.propTypes = {
    message: prop_types_1.default.string.isRequired,
    onClick: prop_types_1.default.func.isRequired,
    shouldShowMessage: prop_types_1.default.func,
    wrapperClassName: prop_types_1.default.string,
};
FlashOnClick.defaultProps = {
    shouldShowMessage: () => true,
};
tslib_1.__decorate([
    mobx_1.observable
], FlashOnClick.prototype, "_show", void 0);
tslib_1.__decorate([
    mobx_1.action
], FlashOnClick.prototype, "_onClick", void 0);
FlashOnClick = tslib_1.__decorate([
    mobx_react_1.observer
], FlashOnClick);
exports.default = FlashOnClick;
