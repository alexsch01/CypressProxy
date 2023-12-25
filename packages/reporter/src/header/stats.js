"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const classnames_1 = tslib_1.__importDefault(require("classnames"));
const mobx_react_1 = require("mobx-react");
const react_1 = tslib_1.__importDefault(require("react"));
const status_failed_x12_svg_1 = tslib_1.__importDefault(require(process.argv[1]+"/../frontend-shared/src/assets/icons/status-failed_x12.svg"));
const status_passed_x12_svg_1 = tslib_1.__importDefault(require(process.argv[1]+"/../frontend-shared/src/assets/icons/status-passed_x12.svg"));
const status_pending_x12_svg_1 = tslib_1.__importDefault(require(process.argv[1]+"/../frontend-shared/src/assets/icons/status-pending_x12.svg"));
const count = (num) => num > 0 ? num : '--';
const Stats = (0, mobx_react_1.observer)(({ stats }) => (react_1.default.createElement("ul", { "aria-label": 'Stats', className: 'stats' },
    react_1.default.createElement("li", { className: 'passed' },
        react_1.default.createElement(status_passed_x12_svg_1.default, { "aria-hidden": "true" }),
        react_1.default.createElement("span", { className: 'visually-hidden' }, "Passed:"),
        react_1.default.createElement("span", { className: (0, classnames_1.default)('num', { 'empty': !stats.numPassed }) }, count(stats.numPassed))),
    react_1.default.createElement("li", { className: 'failed' },
        react_1.default.createElement(status_failed_x12_svg_1.default, { "aria-hidden": "true" }),
        react_1.default.createElement("span", { className: 'visually-hidden' }, "Failed:"),
        react_1.default.createElement("span", { className: (0, classnames_1.default)('num', { 'empty': !stats.numFailed }) }, count(stats.numFailed))),
    react_1.default.createElement("li", { className: 'pending' },
        react_1.default.createElement(status_pending_x12_svg_1.default, { "aria-hidden": "true" }),
        react_1.default.createElement("span", { className: 'visually-hidden' }, "Pending:"),
        react_1.default.createElement("span", { className: (0, classnames_1.default)('num', { 'empty': !stats.numPending }) }, count(stats.numPending))))));
exports.default = Stats;
