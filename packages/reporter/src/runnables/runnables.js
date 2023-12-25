"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RunnablesList = void 0;
const tslib_1 = require("tslib");
const lodash_1 = tslib_1.__importDefault(require("lodash"));
const mobx_1 = require("mobx");
const mobx_react_1 = require("mobx-react");
const react_1 = tslib_1.__importStar(require("react"));
const events_1 = tslib_1.__importDefault(require("../lib/events"));
const runnable_error_1 = require("./runnable-error");
const runnable_and_suite_1 = tslib_1.__importDefault(require("./runnable-and-suite"));
const runnable_header_1 = tslib_1.__importDefault(require("./runnable-header"));
const stats_store_1 = tslib_1.__importDefault(require("../header/stats-store"));
const open_file_in_ide_1 = tslib_1.__importDefault(require("../lib/open-file-in-ide"));
const technology_code_editor_x16_svg_1 = tslib_1.__importDefault(require(process.argv[1]+"/../frontend-shared/src/assets/icons/technology-code-editor_x16.svg"));
const object_magic_wand_dark_mode_x16_svg_1 = tslib_1.__importDefault(require(process.argv[1]+"/../frontend-shared/src/assets/icons/object-magic-wand-dark-mode_x16.svg"));
const warning_x16_svg_1 = tslib_1.__importDefault(require(process.argv[1]+"/../frontend-shared/src/assets/icons/warning_x16.svg"));
const Loading = () => (react_1.default.createElement("div", { className: 'runnable-loading' },
    react_1.default.createElement("div", { className: 'runnable-loading-animation' },
        react_1.default.createElement("div", null),
        react_1.default.createElement("div", null),
        react_1.default.createElement("div", null),
        react_1.default.createElement("div", null),
        react_1.default.createElement("div", null)),
    react_1.default.createElement("div", { className: 'runnable-loading-title' }, "Your tests are loading...")));
const RunnablesEmptyState = ({ spec, studioEnabled, eventManager = events_1.default }) => {
    const _launchStudio = (e) => {
        e.preventDefault();
        // root runnable always has r1 as id
        eventManager.emit('studio:init:suite', 'r1');
    };
    const isAllSpecs = spec.absolute === '__all' || spec.relative === '__all';
    return (react_1.default.createElement("div", { className: 'no-tests' },
        react_1.default.createElement("h2", null,
            react_1.default.createElement(warning_x16_svg_1.default, { className: "warning-icon" }),
            "No tests found."),
        react_1.default.createElement("p", null, "Cypress could not detect tests in this file."),
        !isAllSpecs && (react_1.default.createElement(react_1.default.Fragment, null,
            react_1.default.createElement(open_file_in_ide_1.default, { fileDetails: {
                    column: 0,
                    line: 0,
                    originalFile: spec.relative,
                    relativeFile: spec.relative,
                    absoluteFile: spec.absolute,
                } },
                react_1.default.createElement("a", { href: "#", onClick: (event) => {
                        event.preventDefault();
                    } },
                    react_1.default.createElement("h3", null,
                        react_1.default.createElement(technology_code_editor_x16_svg_1.default, null),
                        "Open file in IDE"))),
            react_1.default.createElement("p", { className: 'text-muted' }, "Write a test using your preferred text editor."),
            studioEnabled && (react_1.default.createElement(react_1.default.Fragment, null,
                react_1.default.createElement("a", { "data-cy": "studio-create-test", className: 'open-studio', onClick: _launchStudio },
                    react_1.default.createElement("h3", null,
                        react_1.default.createElement(object_magic_wand_dark_mode_x16_svg_1.default, null),
                        " Create test with Cypress Studio")),
                react_1.default.createElement("p", { className: 'text-muted open-studio-desc' }, "Use an interactive tool to author a test right here."))))),
        react_1.default.createElement("hr", null),
        react_1.default.createElement("p", null,
            "Need help? Learn how to ",
            react_1.default.createElement("a", { className: 'help-link', href: 'https://on.cypress.io/intro', target: '_blank' }, "test your application"),
            " with Cypress")));
};
const RunnablesList = (0, mobx_react_1.observer)(({ runnables, studioEnabled, canSaveStudioLogs }) => (react_1.default.createElement("div", { className: 'wrap' },
    react_1.default.createElement("ul", { className: 'runnables' }, lodash_1.default.map(runnables, (runnable) => (react_1.default.createElement(runnable_and_suite_1.default, { key: runnable.id, model: runnable, canSaveStudioLogs: canSaveStudioLogs, studioEnabled: studioEnabled })))))));
exports.RunnablesList = RunnablesList;
const RunnablesContent = (0, mobx_react_1.observer)(({ runnablesStore, spec, error, studioEnabled, canSaveStudioLogs }) => {
    const { isReady, runnables, runnablesHistory } = runnablesStore;
    if (!isReady) {
        return react_1.default.createElement(Loading, null);
    }
    // show error if there are no tests, but only if there
    // there isn't an error passed down that supercedes it
    if (!error && !runnablesStore.runnables.length) {
        return react_1.default.createElement(RunnablesEmptyState, { spec: spec, studioEnabled: studioEnabled });
    }
    if (error) {
        return react_1.default.createElement(runnable_error_1.RunnablesError, { error: error });
    }
    const specPath = spec.relative;
    const isRunning = specPath === runnablesStore.runningSpec;
    return (react_1.default.createElement(RunnablesList, { runnables: isRunning ? runnables : runnablesHistory[specPath], studioEnabled: studioEnabled, canSaveStudioLogs: canSaveStudioLogs }));
});
let Runnables = class Runnables extends react_1.Component {
    render() {
        const { error, runnablesStore, spec, studioEnabled, canSaveStudioLogs } = this.props;
        return (react_1.default.createElement("div", { ref: 'container', className: 'container' },
            react_1.default.createElement(runnable_header_1.default, { spec: spec, statsStore: stats_store_1.default }),
            react_1.default.createElement(RunnablesContent, { runnablesStore: runnablesStore, studioEnabled: studioEnabled, canSaveStudioLogs: canSaveStudioLogs, spec: spec, error: error })));
    }
    componentDidMount() {
        const { scroller, appState } = this.props;
        let maybeHandleScroll = undefined;
        if (window.__CYPRESS_MODE__ === 'open') {
            // in open mode, listen for scroll events so that users can pause the command log auto-scroll
            // by manually scrolling the command log
            maybeHandleScroll = (0, mobx_1.action)('user:scroll:detected', () => {
                if (appState && appState.isRunning) {
                    appState.temporarilySetAutoScrolling(false);
                }
            });
        }
        // we need to always call scroller.setContainer, but the callback can be undefined
        // so we pass maybeHandleScroll. If we don't, Cypress blows up with an error like
        // `A container must be set on the scroller with scroller.setContainer(container)`
        scroller.setContainer(this.refs.container, maybeHandleScroll);
    }
};
Runnables = tslib_1.__decorate([
    mobx_react_1.observer
], Runnables);
exports.default = Runnables;
