"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EarlyExitTerminator = void 0;
const tslib_1 = require("tslib");
const errors = tslib_1.__importStar(require("../errors"));
const debug_1 = tslib_1.__importDefault(require("debug"));
const p_defer_1 = tslib_1.__importDefault(require("p-defer"));
const debug = (0, debug_1.default)('cypress:util:crash_handling');
const patchRunResultsAfterCrash = (error, reporterResults, mostRecentRunnable) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
    const endTime = ((_a = reporterResults === null || reporterResults === void 0 ? void 0 : reporterResults.stats) === null || _a === void 0 ? void 0 : _a.wallClockEndedAt) ? Date.parse((_b = reporterResults === null || reporterResults === void 0 ? void 0 : reporterResults.stats) === null || _b === void 0 ? void 0 : _b.wallClockEndedAt) : new Date().getTime();
    const wallClockDuration = ((_c = reporterResults === null || reporterResults === void 0 ? void 0 : reporterResults.stats) === null || _c === void 0 ? void 0 : _c.wallClockStartedAt) ?
        endTime - Date.parse(reporterResults.stats.wallClockStartedAt) : 0;
    const endTimeStamp = new Date(endTime).toJSON();
    // in crash situations, the most recent report will not have the triggering test
    // so the results are manually patched, which produces the expected exit=1 and
    // terminal output indicating the failed test
    return {
        ...reporterResults,
        stats: {
            ...reporterResults === null || reporterResults === void 0 ? void 0 : reporterResults.stats,
            wallClockEndedAt: endTimeStamp,
            wallClockDuration,
            failures: ((_e = (_d = reporterResults === null || reporterResults === void 0 ? void 0 : reporterResults.stats) === null || _d === void 0 ? void 0 : _d.failures) !== null && _e !== void 0 ? _e : 0) + 1,
            skipped: ((_g = (_f = reporterResults === null || reporterResults === void 0 ? void 0 : reporterResults.stats) === null || _f === void 0 ? void 0 : _f.skipped) !== null && _g !== void 0 ? _g : 1) - 1,
        },
        reporterStats: {
            ...reporterResults === null || reporterResults === void 0 ? void 0 : reporterResults.reporterStats,
            tests: ((_j = (_h = reporterResults === null || reporterResults === void 0 ? void 0 : reporterResults.reporterStats) === null || _h === void 0 ? void 0 : _h.tests) !== null && _j !== void 0 ? _j : 0) + 1, // crashed test does not increment this value
            end: ((_k = reporterResults === null || reporterResults === void 0 ? void 0 : reporterResults.reporterStats) === null || _k === void 0 ? void 0 : _k.end) || endTimeStamp,
            duration: wallClockDuration,
            failures: ((_m = (_l = reporterResults === null || reporterResults === void 0 ? void 0 : reporterResults.reporterStats) === null || _l === void 0 ? void 0 : _l.failures) !== null && _m !== void 0 ? _m : 0) + 1,
        },
        tests: ((reporterResults === null || reporterResults === void 0 ? void 0 : reporterResults.tests) || []).map((test) => {
            if (test.testId === mostRecentRunnable.id) {
                return {
                    ...test,
                    state: 'failed',
                    attempts: [
                        ...test.attempts.slice(0, -1),
                        {
                            ...test.attempts[test.attempts.length - 1],
                            state: 'failed',
                        },
                    ],
                };
            }
            return test;
        }),
        error: errors.stripAnsi(error.message),
    };
};
const defaultStats = (error) => {
    return {
        error: errors.stripAnsi(error.message),
        stats: {
            failures: 1,
            tests: 0,
            passes: 0,
            pending: 0,
            suites: 0,
            skipped: 0,
            wallClockDuration: 0,
            wallClockStartedAt: new Date().toJSON(),
            wallClockEndedAt: new Date().toJSON(),
        },
    };
};
class EarlyExitTerminator {
    constructor() {
        this.terminator = (0, p_defer_1.default)();
    }
    waitForEarlyExit(project, exit) {
        debug('waiting for early exit');
        project.on('test:before:run', ({ runnable, previousResults, }) => {
            debug('preparing to run test, previous stats reported as %O', previousResults);
            this.intermediateStats = previousResults;
            this.pendingRunnable = runnable;
        });
        return this.terminator.promise;
    }
    exitEarly(error) {
        if (error.isFatalApiErr) {
            this.terminator.reject(error);
            return;
        }
        // eslint-disable-next-line no-console
        console.log('');
        errors.log(error);
        const runResults = (this.intermediateStats && this.pendingRunnable) ?
            patchRunResultsAfterCrash(error, this.intermediateStats, this.pendingRunnable) :
            defaultStats(error);
        this.terminator.resolve(runResults);
    }
}
exports.EarlyExitTerminator = EarlyExitTerminator;
