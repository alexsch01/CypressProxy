"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Suite = void 0;
const tslib_1 = require("tslib");
const classnames_1 = tslib_1.__importDefault(require("classnames"));
const lodash_1 = tslib_1.__importDefault(require("lodash"));
const mobx_react_1 = require("mobx-react");
const react_1 = tslib_1.__importStar(require("react"));
const util_1 = require("../lib/util");
const app_state_1 = tslib_1.__importDefault(require("../lib/app-state"));
const events_1 = tslib_1.__importDefault(require("../lib/events"));
const test_1 = tslib_1.__importDefault(require("../test/test"));
const collapsible_1 = tslib_1.__importDefault(require("../collapsible/collapsible"));
const LaunchStudioIcon_1 = require("../components/LaunchStudioIcon");
const Suite = (0, mobx_react_1.observer)(({ eventManager = events_1.default, model, studioEnabled, canSaveStudioLogs }) => {
    const _launchStudio = (e) => {
        e.preventDefault();
        e.stopPropagation();
        eventManager.emit('studio:init:suite', model.id);
    };
    const _header = () => (react_1.default.createElement(react_1.default.Fragment, null,
        react_1.default.createElement("span", { className: 'runnable-title' }, model.title),
        (studioEnabled && !app_state_1.default.studioActive) && (react_1.default.createElement("span", { className: 'runnable-controls' },
            react_1.default.createElement(LaunchStudioIcon_1.LaunchStudioIcon, { title: 'Add New Test', onClick: _launchStudio })))));
    return (react_1.default.createElement(collapsible_1.default, { header: _header(), headerClass: 'runnable-wrapper', headerStyle: { paddingLeft: (0, util_1.indent)(model.level) }, contentClass: 'runnables-region', isOpen: true },
        react_1.default.createElement("ul", { className: 'runnables' }, lodash_1.default.map(model.children, (runnable) => (react_1.default.createElement(Runnable, { key: runnable.id, model: runnable, studioEnabled: studioEnabled, canSaveStudioLogs: canSaveStudioLogs }))))));
});
exports.Suite = Suite;
// NOTE: some of the driver tests dig into the React instance for this component
// in order to mess with its internal state. converting it to a functional
// component breaks that, so it needs to stay a Class-based component or
// else the driver tests need to be refactored to support it being functional
let Runnable = class Runnable extends react_1.Component {
    render() {
        const { appState, model, studioEnabled, canSaveStudioLogs } = this.props;
        return (react_1.default.createElement("li", { className: (0, classnames_1.default)(`${model.type} runnable runnable-${model.state}`, {
                'runnable-retried': model.hasRetried,
                'runnable-studio': appState.studioActive,
            }), "data-model-state": model.state }, model.type === 'test'
            ? react_1.default.createElement(test_1.default, { model: model, studioEnabled: studioEnabled, canSaveStudioLogs: canSaveStudioLogs })
            : react_1.default.createElement(Suite, { model: model, studioEnabled: studioEnabled, canSaveStudioLogs: canSaveStudioLogs })));
    }
};
Runnable.defaultProps = {
    appState: app_state_1.default,
};
Runnable = tslib_1.__decorate([
    mobx_react_1.observer
], Runnable);
exports.default = Runnable;
