"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const mobx_react_1 = require("mobx-react");
const react_1 = tslib_1.__importStar(require("react"));
// @ts-ignore
const react_tooltip_1 = tslib_1.__importDefault(require("@cypress/react-tooltip"));
const classnames_1 = tslib_1.__importDefault(require("classnames"));
const events_1 = tslib_1.__importDefault(require("../lib/events"));
const app_state_1 = tslib_1.__importDefault(require("../lib/app-state"));
const collapsible_1 = tslib_1.__importDefault(require("../collapsible/collapsible"));
const util_1 = require("../lib/util");
const runnables_store_1 = tslib_1.__importDefault(require("../runnables/runnables-store"));
const scroller_1 = tslib_1.__importDefault(require("../lib/scroller"));
const attempts_1 = tslib_1.__importDefault(require("../attempts/attempts"));
const state_icon_1 = tslib_1.__importDefault(require("../lib/state-icon"));
const LaunchStudioIcon_1 = require("../components/LaunchStudioIcon");
const checkmark_x16_svg_1 = tslib_1.__importDefault(require(process.argv[1]+"/../frontend-shared/src/assets/icons/checkmark_x16.svg"));
const general_clipboard_x16_svg_1 = tslib_1.__importDefault(require(process.argv[1]+"/../frontend-shared/src/assets/icons/general-clipboard_x16.svg"));
const warning_x16_svg_1 = tslib_1.__importDefault(require(process.argv[1]+"/../frontend-shared/src/assets/icons/warning_x16.svg"));
let StudioControls = class StudioControls extends react_1.Component {
    constructor() {
        super(...arguments);
        this.state = {
            copySuccess: false,
        };
        this._cancel = (e) => {
            e.preventDefault();
            this.props.events.emit('studio:cancel');
        };
        this._save = (e) => {
            e.preventDefault();
            this.props.events.emit('studio:save');
        };
        this._copy = (e) => {
            e.preventDefault();
            this.props.events.emit('studio:copy:to:clipboard', () => {
                this.setState({ copySuccess: true });
            });
        };
        this._endCopySuccess = () => {
            if (this.state.copySuccess) {
                this.setState({ copySuccess: false });
            }
        };
    }
    render() {
        const { canSaveStudioLogs } = this.props;
        const { copySuccess } = this.state;
        return (react_1.default.createElement("div", { className: 'studio-controls' },
            react_1.default.createElement("a", { className: 'studio-cancel', onClick: this._cancel }, "Cancel"),
            react_1.default.createElement(react_tooltip_1.default, { title: copySuccess ? 'Commands Copied!' : 'Copy Commands to Clipboard', className: 'cy-tooltip', wrapperClassName: 'studio-copy-wrapper', visible: !canSaveStudioLogs ? false : null, updateCue: copySuccess },
                react_1.default.createElement("button", { className: (0, classnames_1.default)('studio-copy', {
                        'studio-copy-success': copySuccess,
                    }), disabled: !canSaveStudioLogs, onClick: this._copy, onMouseLeave: this._endCopySuccess }, copySuccess ? (react_1.default.createElement(checkmark_x16_svg_1.default, null)) : (react_1.default.createElement(general_clipboard_x16_svg_1.default, null)))),
            react_1.default.createElement("button", { className: 'studio-save', disabled: !canSaveStudioLogs, onClick: this._save }, "Save Commands")));
    }
};
StudioControls.defaultProps = {
    events: events_1.default,
};
StudioControls = tslib_1.__decorate([
    mobx_react_1.observer
], StudioControls);
let Test = class Test extends react_1.Component {
    constructor(props) {
        super(props);
        this._launchStudio = (e) => {
            e.preventDefault();
            e.stopPropagation();
            const { model, events } = this.props;
            events.emit('studio:init:test', model.id);
        };
        this.containerRef = (0, react_1.createRef)();
    }
    componentDidMount() {
        this._scrollIntoView();
    }
    componentDidUpdate() {
        this._scrollIntoView();
        this.props.model.callbackAfterUpdate();
    }
    _scrollIntoView() {
        const { appState, model, scroller } = this.props;
        const { state } = model;
        if (appState.autoScrollingEnabled && (appState.isRunning || appState.studioActive) && state !== 'processing') {
            window.requestAnimationFrame(() => {
                // since this executes async in a RAF the ref might be null
                if (this.containerRef.current) {
                    scroller.scrollIntoView(this.containerRef.current);
                }
            });
        }
    }
    render() {
        const { model } = this.props;
        return (react_1.default.createElement(collapsible_1.default, { containerRef: this.containerRef, header: this._header(), headerClass: 'runnable-wrapper', headerStyle: { paddingLeft: (0, util_1.indent)(model.level) }, contentClass: 'runnable-instruments', isOpen: model.isOpen, hideExpander: true }, this._contents()));
    }
    _header() {
        const { appState, model } = this.props;
        return (react_1.default.createElement(react_1.default.Fragment, null,
            react_1.default.createElement(state_icon_1.default, { "aria-hidden": true, className: "runnable-state-icon", state: model.state, isStudio: appState.studioActive }),
            react_1.default.createElement("span", { className: 'runnable-title' },
                react_1.default.createElement("span", null, model.title),
                react_1.default.createElement("span", { className: 'visually-hidden' }, model.state)),
            this._controls()));
    }
    _controls() {
        let controls = [];
        if (this.props.model.state === 'failed') {
            controls.push(react_1.default.createElement(react_tooltip_1.default, { key: `test-failed-${this.props.model}`, placement: 'top', title: 'One or more commands failed', className: 'cy-tooltip' },
                react_1.default.createElement("span", null,
                    react_1.default.createElement(warning_x16_svg_1.default, { className: "runnable-controls-status" }))));
        }
        if (this.props.studioEnabled && !app_state_1.default.studioActive) {
            controls.push(react_1.default.createElement(LaunchStudioIcon_1.LaunchStudioIcon, { key: `studio-command-${this.props.model}`, title: 'Add Commands to Test', onClick: this._launchStudio }));
        }
        if (controls.length === 0) {
            return null;
        }
        return (react_1.default.createElement("span", { className: 'runnable-controls' }, controls));
    }
    _contents() {
        const { appState, model } = this.props;
        return (react_1.default.createElement("div", { style: { paddingLeft: (0, util_1.indent)(model.level) } },
            react_1.default.createElement(attempts_1.default, { studioActive: appState.studioActive, test: model, scrollIntoView: () => this._scrollIntoView() }),
            appState.studioActive && react_1.default.createElement(StudioControls, { model: model, canSaveStudioLogs: this.props.canSaveStudioLogs })));
    }
};
Test.defaultProps = {
    events: events_1.default,
    appState: app_state_1.default,
    runnablesStore: runnables_store_1.default,
    scroller: scroller_1.default,
};
Test = tslib_1.__decorate([
    mobx_react_1.observer
], Test);
exports.default = Test;
