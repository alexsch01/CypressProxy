"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Reporter = void 0;
const tslib_1 = require("tslib");
/* global JSX */
const mobx_1 = require("mobx");
const mobx_react_1 = require("mobx-react");
const classnames_1 = tslib_1.__importDefault(require("classnames"));
const react_1 = tslib_1.__importStar(require("react"));
const react_dom_1 = require("react-dom");
// @ts-ignore
const ElementQueries_1 = tslib_1.__importDefault(require("css-element-queries/src/ElementQueries"));
const app_state_1 = tslib_1.__importDefault(require("./lib/app-state"));
const events_1 = tslib_1.__importDefault(require("./lib/events"));
const runnables_store_1 = tslib_1.__importDefault(require("./runnables/runnables-store"));
const scroller_1 = tslib_1.__importDefault(require("./lib/scroller"));
const stats_store_1 = tslib_1.__importDefault(require("./header/stats-store"));
const shortcuts_1 = tslib_1.__importDefault(require("./lib/shortcuts"));
const header_1 = tslib_1.__importDefault(require("./header/header"));
const runnables_1 = tslib_1.__importDefault(require("./runnables/runnables"));
const testing_preferences_1 = tslib_1.__importDefault(require("./preferences/testing-preferences"));
let Reporter = class Reporter extends react_1.Component {
    render() {
        const { appState, className, runnablesStore, scroller, error, statsStore, studioEnabled, renderReporterHeader = (props) => react_1.default.createElement(header_1.default, { ...props }), runnerStore, } = this.props;
        return (react_1.default.createElement("div", { className: (0, classnames_1.default)(className, 'reporter', {
                'studio-active': appState.studioActive,
            }) },
            renderReporterHeader({ appState, statsStore, runnablesStore }),
            (appState === null || appState === void 0 ? void 0 : appState.isPreferencesMenuOpen) ? (react_1.default.createElement(testing_preferences_1.default, { appState: appState })) : (runnerStore.spec && react_1.default.createElement(runnables_1.default, { appState: appState, error: error, runnablesStore: runnablesStore, scroller: scroller, spec: runnerStore.spec, statsStore: statsStore, studioEnabled: studioEnabled, canSaveStudioLogs: runnerStore.canSaveStudioLogs }))));
    }
    // this hook will only trigger if we switch spec file at runtime
    // it never happens in normal e2e but can happen in component-testing mode
    componentDidUpdate(newProps) {
        if (!this.props.runnerStore.spec) {
            throw Error(`Expected runnerStore.spec not to be null.`);
        }
        this.props.runnablesStore.setRunningSpec(this.props.runnerStore.spec.relative);
        if (this.props.resetStatsOnSpecChange &&
            this.props.runnerStore.specRunId !== newProps.runnerStore.specRunId) {
            (0, mobx_1.runInAction)('reporter:stats:reset', () => {
                this.props.statsStore.reset();
            });
        }
    }
    componentDidMount() {
        const { appState, runnablesStore, runner, scroller, statsStore, autoScrollingEnabled, isSpecsListOpen, runnerStore } = this.props;
        if (!runnerStore.spec) {
            throw Error(`Expected runnerStore.spec not to be null.`);
        }
        (0, mobx_1.action)('set:scrolling', () => {
            // set the initial enablement of auto scroll configured inside the user preferences when the app is loaded
            appState.setAutoScrollingUserPref(autoScrollingEnabled);
        })();
        (0, mobx_1.action)('set:specs:list', () => {
            appState.setSpecsList(isSpecsListOpen !== null && isSpecsListOpen !== void 0 ? isSpecsListOpen : false);
        })();
        this.props.events.init({
            appState,
            runnablesStore,
            scroller,
            statsStore,
        });
        this.props.events.listen(runner);
        shortcuts_1.default.start();
        ElementQueries_1.default.init();
        this.props.runnablesStore.setRunningSpec(runnerStore.spec.relative);
    }
    componentWillUnmount() {
        shortcuts_1.default.stop();
    }
};
exports.Reporter = Reporter;
Reporter.defaultProps = {
    runMode: 'single',
    appState: app_state_1.default,
    events: events_1.default,
    runnablesStore: runnables_store_1.default,
    scroller: scroller_1.default,
    statsStore: stats_store_1.default,
};
exports.Reporter = Reporter = tslib_1.__decorate([
    mobx_react_1.observer
], Reporter);
// NOTE: this is for testing Cypress-in-Cypress
if (window.Cypress) {
    window.state = app_state_1.default;
    window.render = (props) => {
        // @ts-ignore
        (0, react_dom_1.render)(react_1.default.createElement(Reporter, { ...props }), document.getElementById('app'));
    };
}
