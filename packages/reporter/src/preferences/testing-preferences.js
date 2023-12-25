"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const mobx_1 = require("mobx");
const mobx_react_1 = require("mobx-react");
const react_1 = tslib_1.__importDefault(require("react"));
const events_1 = tslib_1.__importDefault(require("../lib/events"));
const switch_1 = tslib_1.__importDefault(require("../lib/switch"));
const TestingPreferences = (0, mobx_react_1.observer)(({ events = events_1.default, appState, }) => {
    const toggleAutoScrollingUserPref = () => {
        appState.toggleAutoScrollingUserPref();
        events.emit('save:state');
    };
    return (react_1.default.createElement("div", { className: "testing-preferences" },
        react_1.default.createElement("div", { className: "testing-preferences-header" }, "Testing Preferences"),
        react_1.default.createElement("div", { className: "testing-preference" },
            react_1.default.createElement("div", { className: "testing-preference-header" },
                "Auto-scrolling",
                react_1.default.createElement(switch_1.default, { "data-cy": "auto-scroll-switch", value: appState.autoScrollingUserPref, onUpdate: (0, mobx_1.action)('toggle:auto:scrolling', toggleAutoScrollingUserPref) })),
            react_1.default.createElement("div", null, "Automatically scroll the command log while the tests are running."))));
});
exports.default = TestingPreferences;
