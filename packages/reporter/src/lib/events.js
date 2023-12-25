"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const events_1 = require("events");
const mobx_1 = require("mobx");
const app_state_1 = tslib_1.__importDefault(require("./app-state"));
const runnables_store_1 = tslib_1.__importDefault(require("../runnables/runnables-store"));
const stats_store_1 = tslib_1.__importDefault(require("../header/stats-store"));
const scroller_1 = tslib_1.__importDefault(require("./scroller"));
const localBus = new events_1.EventEmitter();
const events = {
    appState: app_state_1.default,
    runnablesStore: runnables_store_1.default,
    statsStore: stats_store_1.default,
    scroller: scroller_1.default,
    init({ appState, runnablesStore, statsStore, scroller }) {
        this.appState = appState;
        this.runnablesStore = runnablesStore;
        this.statsStore = statsStore;
        this.scroller = scroller;
    },
    listen(runner) {
        const { appState, runnablesStore, scroller, statsStore } = this;
        runner.on('runnables:ready', (0, mobx_1.action)('runnables:ready', (rootRunnable = {}) => {
            runnablesStore.setRunnables(rootRunnable);
        }));
        runner.on('reporter:log:add', (0, mobx_1.action)('log:add', (log) => {
            runnablesStore.addLog(log);
        }));
        runner.on('reporter:log:state:changed', (0, mobx_1.action)('log:update', (log) => {
            runnablesStore.updateLog(log);
        }));
        runner.on('reporter:log:remove', (0, mobx_1.action)('log:remove', (log) => {
            runnablesStore.removeLog(log);
        }));
        runner.on('reporter:restart:test:run', (0, mobx_1.action)('restart:test:run', () => {
            appState.reset();
            runnablesStore.reset();
            statsStore.reset();
            runner.emit('reporter:restarted');
        }));
        runner.on('run:start', (0, mobx_1.action)('run:start', () => {
            if (runnablesStore.hasTests) {
                appState.startRunning();
            }
        }));
        runner.on('reporter:start', (0, mobx_1.action)('start', (startInfo) => {
            appState.temporarilySetAutoScrolling(startInfo.autoScrollingEnabled);
            runnablesStore.setInitialScrollTop(startInfo.scrollTop);
            appState.setStudioActive(startInfo.studioActive);
            if (runnablesStore.hasTests) {
                statsStore.start(startInfo);
            }
        }));
        runner.on('test:before:run:async', (0, mobx_1.action)('test:before:run:async', (runnable) => {
            runnablesStore.runnableStarted(runnable);
        }));
        runner.on('test:after:run', (0, mobx_1.action)('test:after:run', (runnable, isInteractive) => {
            var _a;
            runnablesStore.runnableFinished(runnable, isInteractive);
            if (runnable.final && !appState.studioActive) {
                // When displaying the overall test status, we want to reference the test outerStatus
                // as the last runnable (test attempt) may have passed, but the outerStatus might mark the test run as a failure.
                statsStore.incrementCount(((_a = runnable === null || runnable === void 0 ? void 0 : runnable._cypressTestStatusInfo) === null || _a === void 0 ? void 0 : _a.outerStatus) || runnable.state);
            }
        }));
        runner.on('test:set:state', (0, mobx_1.action)('test:set:state', (props, cb) => {
            runnablesStore.updateTest(props, cb);
        }));
        runner.on('paused', (0, mobx_1.action)('paused', (nextCommandName) => {
            appState.pause(nextCommandName);
            statsStore.pause();
        }));
        runner.on('run:end', (0, mobx_1.action)('run:end', () => {
            appState.end();
            statsStore.end();
        }));
        runner.on('reporter:collect:run:state', (cb) => {
            cb({
                autoScrollingEnabled: appState.autoScrollingEnabled,
                scrollTop: scroller.getScrollTop(),
            });
        });
        runner.on('reporter:snapshot:unpinned', (0, mobx_1.action)('snapshot:unpinned', () => {
            appState.pinnedSnapshotId = null;
        }));
        localBus.on('resume', (0, mobx_1.action)('resume', () => {
            appState.resume();
            statsStore.resume();
            runner.emit('runner:resume');
        }));
        localBus.on('next', (0, mobx_1.action)('next', () => {
            appState.resume();
            statsStore.resume();
            runner.emit('runner:next');
        }));
        localBus.on('stop', (0, mobx_1.action)('stop', () => {
            appState.stop();
            runner.emit('runner:stop');
        }));
        localBus.on('testFilter:cloudDebug:dismiss', () => {
            runner.emit('testFilter:cloudDebug:dismiss');
        });
        localBus.on('restart', (0, mobx_1.action)('restart', () => {
            runner.emit('runner:restart');
        }));
        localBus.on('show:command', (testId, logId) => {
            runner.emit('runner:console:log', testId, logId);
        });
        localBus.on('show:error', ({ err, testId, commandId }) => {
            runner.emit('runner:console:error', {
                err,
                testId,
                logId: commandId,
            });
        });
        localBus.on('show:snapshot', (testId, logId) => {
            runner.emit('runner:show:snapshot', testId, logId);
        });
        localBus.on('hide:snapshot', (testId, logId) => {
            runner.emit('runner:hide:snapshot', testId, logId);
        });
        localBus.on('pin:snapshot', (testId, logId) => {
            runner.emit('runner:pin:snapshot', testId, logId);
        });
        localBus.on('unpin:snapshot', (testId, logId) => {
            runner.emit('runner:unpin:snapshot', testId, logId);
        });
        localBus.on('get:user:editor', (cb) => {
            runner.emit('get:user:editor', cb);
        });
        localBus.on('clear:all:sessions', (cb) => {
            runner.emit('clear:all:sessions', cb);
        });
        localBus.on('set:user:editor', (editor) => {
            runner.emit('set:user:editor', editor);
        });
        localBus.on('save:state', () => {
            runner.emit('save:state', {
                // the "autoScrollingEnabled" key in `savedState` stores to the preference value itself, it is not the same as the "autoScrollingEnabled" variable stored in application state, which can be temporarily deactivated
                autoScrollingEnabled: appState.autoScrollingUserPref,
                isSpecsListOpen: appState.isSpecsListOpen,
            });
        });
        localBus.on('external:open', (url) => {
            runner.emit('external:open', url);
        });
        localBus.on('open:file', (fileDetails) => {
            runner.emit('open:file', fileDetails);
        });
        localBus.on('open:file:unified', (fileDetails) => {
            runner.emit('open:file:unified', fileDetails);
        });
        localBus.on('studio:init:test', (testId) => {
            runner.emit('studio:init:test', testId);
        });
        localBus.on('studio:init:suite', (suiteId) => {
            runner.emit('studio:init:suite', suiteId);
        });
        localBus.on('studio:remove:command', (commandId) => {
            runner.emit('studio:remove:command', commandId);
        });
        localBus.on('studio:cancel', () => {
            runner.emit('studio:cancel');
        });
        localBus.on('studio:save', () => {
            runner.emit('studio:save');
        });
        localBus.on('studio:copy:to:clipboard', (cb) => {
            runner.emit('studio:copy:to:clipboard', cb);
        });
    },
    emit(event, ...args) {
        localBus.emit(event, ...args);
    },
    // for testing purposes
    __off() {
        localBus.removeAllListeners();
    },
};
exports.default = events;
