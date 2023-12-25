"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const mobx_react_1 = require("mobx-react");
const react_1 = tslib_1.__importDefault(require("react"));
// @ts-ignore
const react_tooltip_1 = tslib_1.__importDefault(require("@cypress/react-tooltip"));
const menu_expand_right_x16_svg_1 = tslib_1.__importDefault(require(process.argv[1]+"/../frontend-shared/src/assets/icons/menu-expand-right_x16.svg"));
const events_1 = tslib_1.__importDefault(require("../lib/events"));
const mobx_1 = require("mobx");
const controls_1 = tslib_1.__importDefault(require("./controls"));
const stats_1 = tslib_1.__importDefault(require("./stats"));
const DebugDismiss_1 = require("./DebugDismiss");
const Header = (0, mobx_react_1.observer)(({ appState, events = events_1.default, statsStore, runnablesStore }) => (react_1.default.createElement("header", null,
    react_1.default.createElement(react_tooltip_1.default, { placement: 'bottom', title: react_1.default.createElement("p", null,
            appState.isSpecsListOpen ? 'Collapse' : 'Expand',
            " Specs List ",
            react_1.default.createElement("span", { className: 'kbd' }, "F")), wrapperClassName: 'toggle-specs-wrapper', className: 'cy-tooltip' },
        react_1.default.createElement("button", { "aria-controls": "reporter-inline-specs-list", "aria-expanded": appState.isSpecsListOpen, onClick: () => {
                (0, mobx_1.action)('toggle:spec:list', () => {
                    appState.toggleSpecList();
                    events.emit('save:state');
                })();
            } },
            react_1.default.createElement(menu_expand_right_x16_svg_1.default, { style: { transform: appState.isSpecsListOpen ? 'rotate(180deg)' : 'rotate(0deg)' } }),
            react_1.default.createElement("span", { className: 'toggle-specs-text' }, "Specs"))),
    react_1.default.createElement("div", { className: 'spacer' }),
    runnablesStore.testFilter && runnablesStore.totalTests > 0 && react_1.default.createElement(DebugDismiss_1.DebugDismiss, { matched: runnablesStore.totalTests, total: runnablesStore.totalUnfilteredTests }),
    react_1.default.createElement(stats_1.default, { stats: statsStore }),
    react_1.default.createElement(controls_1.default, { appState: appState }))));
exports.default = Header;
