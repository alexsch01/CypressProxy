"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const classnames_1 = tslib_1.__importDefault(require("classnames"));
const mobx_react_1 = require("mobx-react");
const react_1 = tslib_1.__importDefault(require("react"));
const status_failed_x12_svg_1 = tslib_1.__importDefault(require(process.argv[1]+"/../frontend-shared/src/assets/icons/status-failed_x12.svg"));
const status_passed_x12_svg_1 = tslib_1.__importDefault(require(process.argv[1]+"/../frontend-shared/src/assets/icons/status-passed_x12.svg"));
const status_pending_x12_svg_1 = tslib_1.__importDefault(require(process.argv[1]+"/../frontend-shared/src/assets/icons/status-pending_x12.svg"));
const status_processing_x12_svg_1 = tslib_1.__importDefault(require(process.argv[1]+"/../frontend-shared/src/assets/icons/status-processing_x12.svg"));
const status_running_x12_svg_1 = tslib_1.__importDefault(require(process.argv[1]+"/../frontend-shared/src/assets/icons/status-running_x12.svg"));
const object_magic_wand_dark_mode_x16_svg_1 = tslib_1.__importDefault(require(process.argv[1]+"/../frontend-shared/src/assets/icons/object-magic-wand-dark-mode_x16.svg"));
const StateIcon = (0, mobx_react_1.observer)((props) => {
    const { state, isStudio, ...rest } = props;
    if (state === 'active') {
        return (react_1.default.createElement(status_running_x12_svg_1.default, { ...rest, className: (0, classnames_1.default)('fa-spin', rest.className) }));
    }
    if (state === 'failed') {
        return (react_1.default.createElement(status_failed_x12_svg_1.default, { ...rest }));
    }
    if (state === 'passed') {
        if (isStudio) {
            return (react_1.default.createElement(object_magic_wand_dark_mode_x16_svg_1.default, { ...rest, className: (0, classnames_1.default)('wand-icon', rest.className), viewBox: "0 0 16 16", width: "12px", height: "12px" }));
        }
        return (react_1.default.createElement(status_passed_x12_svg_1.default, { ...rest }));
    }
    if (state === 'pending') {
        return (react_1.default.createElement(status_pending_x12_svg_1.default, { ...rest }));
    }
    if (state === 'processing') {
        return (react_1.default.createElement(status_processing_x12_svg_1.default, { ...rest }));
    }
    return (react_1.default.createElement(status_pending_x12_svg_1.default, null));
});
exports.default = StateIcon;
