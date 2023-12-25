"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DebugDismiss = void 0;
const tslib_1 = require("tslib");
const react_1 = tslib_1.__importDefault(require("react"));
const debugger_x16_svg_1 = tslib_1.__importDefault(require(process.argv[1]+"/../frontend-shared/src/assets/icons/debugger_x16.svg"));
const status_failed_x12_svg_1 = tslib_1.__importDefault(require(process.argv[1]+"/../frontend-shared/src/assets/icons/status-failed_x12.svg"));
const events_1 = tslib_1.__importDefault(require("../lib/events"));
const DebugDismiss = (props) => {
    return (react_1.default.createElement("button", { type: 'button', className: "debug-dismiss", onClick: () => events_1.default.emit('testFilter:cloudDebug:dismiss') },
        react_1.default.createElement(debugger_x16_svg_1.default, null),
        react_1.default.createElement("span", null,
            props.matched,
            " / ",
            props.total,
            " ",
            props.total > 1 ? 'tests' : 'test'),
        react_1.default.createElement(status_failed_x12_svg_1.default, { className: "delete-icon" })));
};
exports.DebugDismiss = DebugDismiss;
