"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const classnames_1 = tslib_1.__importDefault(require("classnames"));
const react_1 = tslib_1.__importDefault(require("react"));
const mobx_react_1 = require("mobx-react");
const globe_x12_svg_1 = tslib_1.__importDefault(require(process.argv[1]+"/../frontend-shared/src/assets/icons/globe_x12.svg"));
const events_1 = tslib_1.__importDefault(require("../lib/events"));
const collapsible_1 = tslib_1.__importDefault(require("../collapsible/collapsible"));
const tag_1 = tslib_1.__importDefault(require("../lib/tag"));
const flash_on_click_1 = tslib_1.__importDefault(require("../lib/flash-on-click"));
const SessionRow = (model) => {
    const { name, isGlobalSession, id, status, testId } = model;
    const printToConsole = (id) => {
        events_1.default.emit('show:command', testId, id);
    };
    return (react_1.default.createElement(flash_on_click_1.default, { key: name, message: 'Printed output to your console', onClick: () => printToConsole(id), shouldShowMessage: () => true, wrapperClassName: 'session-item-wrapper' },
        react_1.default.createElement("div", { className: 'session-item' },
            react_1.default.createElement("span", { className: (0, classnames_1.default)('session-info', { 'spec-session': !isGlobalSession }) },
                isGlobalSession && react_1.default.createElement(globe_x12_svg_1.default, { className: 'global-session-icon' }),
                name),
            react_1.default.createElement(tag_1.default, { customClassName: 'session-status', content: status, type: model.tagType }))));
};
const Sessions = ({ model }) => {
    const sessions = Object.values(model);
    if (sessions.length === 0) {
        return null;
    }
    return (react_1.default.createElement("ul", { className: 'instruments-container hooks-container sessions-container' },
        react_1.default.createElement("li", { className: 'hook-item' },
            react_1.default.createElement(collapsible_1.default, { header: react_1.default.createElement(react_1.default.Fragment, null,
                    "Sessions ",
                    react_1.default.createElement("i", { style: { textTransform: 'none' } },
                        "(",
                        sessions.length,
                        ")")), headerClass: 'hook-header', headerExtras: react_1.default.createElement("div", { className: "clear-sessions", onClick: () => events_1.default.emit('clear:all:sessions') },
                    react_1.default.createElement("span", null,
                        react_1.default.createElement("i", { className: "fas fa-ban" }),
                        " Clear All Sessions")), contentClass: 'instrument-content session-content' }, sessions.map((session) => (react_1.default.createElement(SessionRow, { key: session.id, ...session })))))));
};
exports.default = (0, mobx_react_1.observer)(Sessions);
