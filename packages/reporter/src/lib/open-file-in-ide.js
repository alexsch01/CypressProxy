"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const mobx_react_1 = require("mobx-react");
const react_1 = tslib_1.__importDefault(require("react"));
const events_1 = tslib_1.__importDefault(require("./events"));
// Catches click events that bubble from children and emits open file events to
// be handled by the app.
const OpenFileInIDE = (0, mobx_react_1.observer)((props) => {
    return (react_1.default.createElement("span", { className: props.className, onClick: () => events_1.default.emit('open:file:unified', props.fileDetails) }, props.children));
});
exports.default = OpenFileInIDE;
