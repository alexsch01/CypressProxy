"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RunnablesStore = void 0;
const tslib_1 = require("tslib");
const lodash_1 = tslib_1.__importDefault(require("lodash"));
const mobx_1 = require("mobx");
const app_state_1 = tslib_1.__importDefault(require("../lib/app-state"));
const scroller_1 = tslib_1.__importDefault(require("../lib/scroller"));
const test_model_1 = tslib_1.__importDefault(require("../test/test-model"));
const suite_model_1 = tslib_1.__importDefault(require("./suite-model"));
const defaults = {
    hasSingleTest: false,
    hasTests: false,
    isReady: false,
    attemptingShowSnapshot: false,
    showingSnapshot: false,
};
class RunnablesStore {
    constructor({ appState, scroller }) {
        this.isReady = defaults.isReady;
        this.runnables = [];
        /**
         * Stores a list of all the runnables files where the reporter
         * has passed without any specific order.
         *
         * key: spec FilePath
         * content: RunnableArray
         */
        this.runnablesHistory = {};
        this.totalTests = 0;
        this.totalUnfilteredTests = 0;
        this.runningSpec = null;
        this.hasTests = false;
        this.hasSingleTest = false;
        this._tests = {};
        this._runnablesQueue = [];
        this.attemptingShowSnapshot = defaults.attemptingShowSnapshot;
        this.showingSnapshot = defaults.showingSnapshot;
        this.appState = appState;
        this.scroller = scroller;
    }
    setRunnables(rootRunnable) {
        this.runnables = this._createRunnableChildren(rootRunnable, 0);
        this.isReady = true;
        const numTests = lodash_1.default.keys(this._tests).length;
        this.hasTests = numTests > 0;
        this.hasSingleTest = numTests === 1;
        this.totalTests = numTests;
        this.totalUnfilteredTests = rootRunnable.totalUnfilteredTests || 0;
        this.testFilter = rootRunnable.testFilter;
        this._finishedInitialRendering();
    }
    _createRunnableChildren(runnableProps, level) {
        return this._createRunnables('test', runnableProps.tests || [], runnableProps.hooks || [], level).concat(this._createRunnables('suite', runnableProps.suites || [], runnableProps.hooks || [], level));
    }
    _createRunnables(type, runnables, hooks, level) {
        return lodash_1.default.map(runnables, (runnableProps) => {
            return this._createRunnable(type, runnableProps, hooks, level);
        });
    }
    _createRunnable(type, props, hooks, level) {
        props.hooks = lodash_1.default.unionBy(props.hooks, hooks, 'hookId');
        return type === 'suite' ? this._createSuite(props, level) : this._createTest(props, level);
    }
    _createSuite(props, level) {
        const suite = new suite_model_1.default(props, level);
        this._runnablesQueue.push(suite);
        suite.children = this._createRunnableChildren(props, ++level);
        return suite;
    }
    _createTest(props, level) {
        const test = new test_model_1.default(props, level, this);
        this._runnablesQueue.push(test);
        this._tests[test.id] = test;
        return test;
    }
    _finishedInitialRendering() {
        if (this.appState.isRunning) {
            // have an initial scrollTop set, meaning we reloaded from a domain change
            // so reset to the saved scrollTop
            if (this._initialScrollTop)
                this.scroller.setScrollTop(this._initialScrollTop);
        }
        else {
            // finished running before initial rendering complete (but wasn't manually
            // stopped), meaning some tests didn't get a chance to get scrolled to
            // scroll to the end since that's the right place to be
            if (this.appState.autoScrollingEnabled && !this.appState.isStopped) {
                this.scroller.scrollToEnd();
            }
        }
    }
    setInitialScrollTop(initialScrollTop) {
        this._initialScrollTop = initialScrollTop;
    }
    updateTest(props, cb) {
        this._withTest(props.id, (test) => {
            test.update(props, cb);
        });
    }
    runnableStarted(props) {
        this._withTest(props.id, (test) => {
            test.start(props);
        });
    }
    runnableFinished(props, isInteractive) {
        this._withTest(props.id, (test) => {
            test.finish(props, isInteractive);
        });
    }
    testById(id) {
        return this._tests[id];
    }
    addLog(props) {
        this._withTest(props.testId, (test) => {
            test.addLog(props);
        });
    }
    _withTest(id, cb) {
        // we get events for suites and tests, but only tests change during a run,
        // so if the id isn't found in this._tests, we ignore it b/c it's a suite
        const test = this._tests[id];
        if (test)
            cb(test);
    }
    updateLog(props) {
        this._withTest(props.testId, (test) => {
            test.updateLog(props);
        });
    }
    removeLog(props) {
        this._withTest(props.testId, (test) => {
            test.removeLog(props);
        });
    }
    reset() {
        lodash_1.default.each(defaults, (value, key) => {
            this[key] = value;
        });
        this.runnables = [];
        this.runnablesHistory = {};
        this._tests = {};
        this._runnablesQueue = [];
        this.totalTests = 0;
    }
    setRunningSpec(specPath) {
        const previousSpec = this.runningSpec;
        this.runningSpec = specPath;
        if (!previousSpec || previousSpec === specPath) {
            return;
        }
        this.runnablesHistory[previousSpec] = this.runnables;
    }
}
exports.RunnablesStore = RunnablesStore;
tslib_1.__decorate([
    mobx_1.observable
], RunnablesStore.prototype, "isReady", void 0);
tslib_1.__decorate([
    mobx_1.observable
], RunnablesStore.prototype, "runnables", void 0);
tslib_1.__decorate([
    mobx_1.observable
], RunnablesStore.prototype, "runnablesHistory", void 0);
tslib_1.__decorate([
    mobx_1.observable
], RunnablesStore.prototype, "totalTests", void 0);
tslib_1.__decorate([
    mobx_1.observable
], RunnablesStore.prototype, "totalUnfilteredTests", void 0);
tslib_1.__decorate([
    mobx_1.observable
], RunnablesStore.prototype, "testFilter", void 0);
tslib_1.__decorate([
    mobx_1.action
], RunnablesStore.prototype, "setRunningSpec", null);
exports.default = new RunnablesStore({ appState: app_state_1.default, scroller: scroller_1.default });
