"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NoCommands = exports.AttemptHeader = exports.Attempt = void 0;
const tslib_1 = require("tslib");
const classnames_1 = tslib_1.__importDefault(require("classnames"));
const mobx_react_1 = require("mobx-react");
const react_1 = tslib_1.__importStar(require("react"));
const agents_1 = tslib_1.__importDefault(require("../agents/agents"));
const collapsible_1 = tslib_1.__importDefault(require("../collapsible/collapsible"));
const hooks_1 = tslib_1.__importDefault(require("../hooks/hooks"));
const routes_1 = tslib_1.__importDefault(require("../routes/routes"));
const test_error_1 = tslib_1.__importDefault(require("../errors/test-error"));
const sessions_1 = tslib_1.__importDefault(require("../sessions/sessions"));
const collapse_x16_svg_1 = tslib_1.__importDefault(require(process.argv[1]+"/../frontend-shared/src/assets/icons/collapse_x16.svg"));
const expand_x16_svg_1 = tslib_1.__importDefault(require(process.argv[1]+"/../frontend-shared/src/assets/icons/expand_x16.svg"));
const state_icon_1 = tslib_1.__importDefault(require("../lib/state-icon"));
const NoCommands = () => (react_1.default.createElement("ul", { className: 'hooks-container' },
    react_1.default.createElement("li", { className: 'no-commands' }, "No commands were issued in this test.")));
exports.NoCommands = NoCommands;
const AttemptHeader = ({ index, state }) => (react_1.default.createElement("span", { className: 'attempt-tag' },
    react_1.default.createElement("span", { className: 'open-close-indicator' },
        react_1.default.createElement(collapse_x16_svg_1.default, { className: 'collapse-icon' }),
        react_1.default.createElement(expand_x16_svg_1.default, { className: 'expand-icon' })),
    "Attempt ",
    index + 1,
    react_1.default.createElement(state_icon_1.default, { state: state, className: "attempt-state" })));
exports.AttemptHeader = AttemptHeader;
const StudioError = () => (react_1.default.createElement("div", { className: 'runnable-err-wrapper studio-err-wrapper' },
    react_1.default.createElement("div", { className: 'runnable-err' },
        react_1.default.createElement("div", { className: 'runnable-err-message' }, "Studio cannot add commands to a failing test."))));
function renderAttemptContent(model, studioActive) {
    // performance optimization - don't render contents if not open
    return (react_1.default.createElement("div", { className: `attempt-${model.id + 1}` },
        react_1.default.createElement(sessions_1.default, { model: model.sessions }),
        react_1.default.createElement(agents_1.default, { model: model }),
        react_1.default.createElement(routes_1.default, { model: model }),
        react_1.default.createElement("div", { ref: 'commands', className: 'runnable-commands-region' }, model.hasCommands ? react_1.default.createElement(hooks_1.default, { model: model }) : react_1.default.createElement(NoCommands, null)),
        model.state === 'failed' && (react_1.default.createElement("div", { className: 'attempt-error-region' },
            react_1.default.createElement(test_error_1.default, { ...model.error }),
            studioActive && react_1.default.createElement(StudioError, null)))));
}
let Attempt = class Attempt extends react_1.Component {
    componentDidUpdate() {
        this.props.scrollIntoView();
    }
    render() {
        const { model, studioActive } = this.props;
        // HACK: causes component update when command log is added
        model.commands.length;
        return (react_1.default.createElement("li", { key: model.id, className: (0, classnames_1.default)('attempt-item', `attempt-state-${model.state}`), ref: "container" },
            react_1.default.createElement(collapsible_1.default, { header: react_1.default.createElement(AttemptHeader, { index: model.id, state: model.state }), hideExpander: true, headerClass: 'attempt-name', contentClass: 'attempt-content', isOpen: model.isOpen }, renderAttemptContent(model, studioActive))));
    }
};
exports.Attempt = Attempt;
exports.Attempt = Attempt = tslib_1.__decorate([
    mobx_react_1.observer
], Attempt);
const Attempts = (0, mobx_react_1.observer)(({ test, scrollIntoView, studioActive }) => {
    return (react_1.default.createElement("ul", { className: (0, classnames_1.default)('attempts', {
            'has-multiple-attempts': test.hasMultipleAttempts,
        }) }, test.attempts.map((attempt) => {
        return (react_1.default.createElement(Attempt, { key: attempt.id, scrollIntoView: scrollIntoView, studioActive: studioActive, model: attempt }));
    })));
});
exports.default = Attempts;
