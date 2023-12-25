"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LaunchStudioIcon = void 0;
const tslib_1 = require("tslib");
const react_1 = tslib_1.__importDefault(require("react"));
// @ts-ignore
const react_tooltip_1 = tslib_1.__importDefault(require("@cypress/react-tooltip"));
const object_magic_wand_dark_mode_x16_svg_1 = tslib_1.__importDefault(require(process.argv[1]+"/../frontend-shared/src/assets/icons/object-magic-wand-dark-mode_x16.svg"));
const LaunchStudioIcon = ({ title, onClick }) => {
    return (react_1.default.createElement(react_tooltip_1.default, { title: title, placement: 'right', className: 'cy-tooltip' },
        react_1.default.createElement("a", { onClick: onClick, className: 'runnable-controls-studio', "data-cy": 'launch-studio' },
            react_1.default.createElement(object_magic_wand_dark_mode_x16_svg_1.default, null))));
};
exports.LaunchStudioIcon = LaunchStudioIcon;
