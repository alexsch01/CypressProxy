"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const classnames_1 = tslib_1.__importDefault(require("classnames"));
const mobx_1 = require("mobx");
const mobx_react_1 = require("mobx-react");
const react_1 = tslib_1.__importDefault(require("react"));
// @ts-ignore
const react_tooltip_1 = tslib_1.__importDefault(require("@cypress/react-tooltip"));
const events_1 = tslib_1.__importDefault(require("../lib/events"));
const chevron_down_small_x16_svg_1 = tslib_1.__importDefault(require(process.argv[1]+"/../frontend-shared/src/assets/icons/chevron-down-small_x16.svg"));
const chevron_up_small_x16_svg_1 = tslib_1.__importDefault(require(process.argv[1]+"/../frontend-shared/src/assets/icons/chevron-up-small_x16.svg"));
const action_next_x16_svg_1 = tslib_1.__importDefault(require(process.argv[1]+"/../frontend-shared/src/assets/icons/action-next_x16.svg"));
const action_play_x16_svg_1 = tslib_1.__importDefault(require(process.argv[1]+"/../frontend-shared/src/assets/icons/action-play_x16.svg"));
const action_restart_x16_svg_1 = tslib_1.__importDefault(require(process.argv[1]+"/../frontend-shared/src/assets/icons/action-restart_x16.svg"));
const action_stop_x16_svg_1 = tslib_1.__importDefault(require(process.argv[1]+"/../frontend-shared/src/assets/icons/action-stop_x16.svg"));
const ifThen = (condition, component) => (condition ? component : null);
const Controls = (0, mobx_react_1.observer)(({ events = events_1.default, appState }) => {
    const emit = (event) => () => events.emit(event);
    const togglePreferencesMenu = () => {
        appState.togglePreferencesMenu();
        events.emit('save:state');
    };
    return (react_1.default.createElement("div", { className: 'controls' },
        react_1.default.createElement(react_tooltip_1.default, { placement: 'bottom', title: react_1.default.createElement("p", null, "Open Testing Preferences"), className: 'cy-tooltip' },
            react_1.default.createElement("button", { "aria-label": 'Open testing preferences', className: (0, classnames_1.default)('testing-preferences-toggle', { 'open': appState.isPreferencesMenuOpen }), onClick: (0, mobx_1.action)('toggle:preferences:menu', togglePreferencesMenu) }, appState.isPreferencesMenuOpen ? (react_1.default.createElement(chevron_up_small_x16_svg_1.default, null)) : (react_1.default.createElement(chevron_down_small_x16_svg_1.default, null)))),
        ifThen(appState.isPaused, (react_1.default.createElement(react_tooltip_1.default, { placement: 'bottom', title: react_1.default.createElement("p", null,
                "Resume ",
                react_1.default.createElement("span", { className: 'kbd' }, "C")), className: 'cy-tooltip' },
            react_1.default.createElement("button", { "aria-label": 'Resume', className: 'play', onClick: emit('resume') },
                react_1.default.createElement(action_play_x16_svg_1.default, null))))),
        ifThen(appState.isRunning && !appState.isPaused, (react_1.default.createElement(react_tooltip_1.default, { placement: 'bottom', title: react_1.default.createElement("p", null,
                "Stop Running ",
                react_1.default.createElement("span", { className: 'kbd' }, "S")), className: 'cy-tooltip', visible: appState.studioActive ? false : null },
            react_1.default.createElement("button", { "aria-label": 'Stop', className: 'stop', onClick: emit('stop'), disabled: appState.studioActive },
                react_1.default.createElement(action_stop_x16_svg_1.default, null))))),
        ifThen(!appState.isRunning, (react_1.default.createElement(react_tooltip_1.default, { placement: 'bottom', title: react_1.default.createElement("p", null,
                "Run All Tests ",
                react_1.default.createElement("span", { className: 'kbd' }, "R")), className: 'cy-tooltip' },
            react_1.default.createElement("button", { "aria-label": 'Rerun all tests', className: 'restart', onClick: emit('restart') }, appState.studioActive ? (react_1.default.createElement(action_restart_x16_svg_1.default, { transform: "scale(-1 1)" })) : (react_1.default.createElement(action_restart_x16_svg_1.default, null)))))),
        ifThen(!!appState.nextCommandName, (react_1.default.createElement(react_tooltip_1.default, { placement: 'bottom', title: react_1.default.createElement("p", null,
                "Next ",
                react_1.default.createElement("span", { className: 'kbd' }, "[N]:"),
                appState.nextCommandName), className: 'cy-tooltip' },
            react_1.default.createElement("button", { "aria-label": `Next '${appState.nextCommandName}'`, className: 'next', onClick: emit('next') },
                react_1.default.createElement(action_next_x16_svg_1.default, null)))))));
});
exports.default = Controls;
