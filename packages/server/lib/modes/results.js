"use strict";
/* eslint-disable @cypress/dev/arrow-body-multiline-braces */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPublicSpecResults = exports.createPublicSpec = exports.createPublicRunResults = exports.createPublicConfig = exports.createPublicBrowser = void 0;
const tslib_1 = require("tslib");
const lodash_1 = tslib_1.__importDefault(require("lodash"));
const path_1 = tslib_1.__importDefault(require("path"));
const createPublicTest = (test) => {
    const duration = lodash_1.default.reduce(test.attempts, (memo, attempt) => {
        return memo + (attempt.wallClockDuration || 0);
    }, 0);
    return {
        attempts: lodash_1.default.map(test.attempts, ({ state }) => ({ state })),
        displayError: test.displayError,
        duration,
        state: test.state,
        title: test.title,
    };
};
const createPublicRun = (run) => ({
    error: run.error,
    reporter: run.reporter,
    reporterStats: run.reporterStats,
    screenshots: lodash_1.default.map(run.screenshots, (screenshot) => ({
        height: screenshot.height,
        name: screenshot.name,
        path: screenshot.path,
        takenAt: screenshot.takenAt,
        width: screenshot.width,
    })),
    spec: (0, exports.createPublicSpec)(run.spec),
    stats: {
        duration: run.stats.wallClockDuration,
        endedAt: run.stats.wallClockEndedAt,
        failures: run.stats.failures,
        passes: run.stats.passes,
        pending: run.stats.pending,
        skipped: run.stats.skipped,
        startedAt: run.stats.wallClockStartedAt,
        suites: run.stats.suites,
        tests: run.stats.tests,
    },
    tests: lodash_1.default.map(run.tests, createPublicTest),
    video: run.video,
});
/**
 * Normalize browser object to remove private props and make it more consistent
 */
const createPublicBrowser = (browser) => {
    return {
        channel: browser.channel,
        displayName: browser.displayName,
        family: browser.family,
        majorVersion: browser.majorVersion,
        name: browser.name,
        path: browser.path,
        version: browser.version,
    };
};
exports.createPublicBrowser = createPublicBrowser;
const omitConfigKeys = [
    'additionalIgnorePattern',
    'autoOpen',
    'browserUrl',
    'clientRoute',
    'cypressEnv',
    'devServerPublicPathRoute',
    'morgan',
    'namespace',
    'proxyServer',
    'proxyUrl',
    'rawJson',
    'remote',
    'repoRoot',
    'report',
    'reporterRoute',
    'reporterUrl',
    'resolved',
    'setupNodeEvents',
    'socketId',
    'socketIoCookie',
    'socketIoRoute',
    'specs',
    'state',
    'supportFolder',
    'protocolEnabled',
    'hideCommandLog',
    'hideRunnerUi',
];
/**
 * Normalize config object to remove private props and make it more consistent
 */
const createPublicConfig = (config) => {
    // this removes/changes values while leaving all others as-is, so that new
    // config properties don't need to be manually accounted for
    return {
        ...lodash_1.default.omit(config, omitConfigKeys),
        browsers: lodash_1.default.map(config.browsers, exports.createPublicBrowser),
        // @ts-expect-error
        cypressInternalEnv: config.cypressEnv,
    };
};
exports.createPublicConfig = createPublicConfig;
/**
 * Normalize results for module API/after:run to remove private props and make
 * them more consistent and user-friendly
 */
const createPublicRunResults = (results) => ({
    browserName: results.browserName,
    browserPath: results.browserPath,
    browserVersion: results.browserVersion,
    config: (0, exports.createPublicConfig)(results.config),
    cypressVersion: results.cypressVersion,
    endedTestsAt: results.endedTestsAt,
    osName: results.osName,
    osVersion: results.osVersion,
    runs: lodash_1.default.map(results.runs, createPublicRun),
    runUrl: results.runUrl,
    startedTestsAt: results.startedTestsAt,
    totalDuration: results.totalDuration,
    totalFailed: results.totalFailed,
    totalPassed: results.totalPassed,
    totalPending: results.totalPending,
    totalSkipped: results.totalSkipped,
    totalSuites: results.totalSuites,
    totalTests: results.totalTests,
});
exports.createPublicRunResults = createPublicRunResults;
/**
 * Normalize spec object to remove private props and make it more consistent
 */
const createPublicSpec = (spec) => {
    return {
        absolute: spec.absolute,
        fileExtension: spec.fileExtension,
        fileName: spec.fileName,
        name: path_1.default.basename(spec.name || ''),
        relative: spec.relative,
    };
};
exports.createPublicSpec = createPublicSpec;
/**
 * Normalize results for after:spec to remove private props and make
 * them more consistent and user-friendly
 */
const createPublicSpecResults = (spec, runResult) => {
    return [(0, exports.createPublicSpec)(spec), createPublicRun(runResult)];
};
exports.createPublicSpecResults = createPublicSpecResults;
