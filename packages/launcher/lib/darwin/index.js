"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.detect = exports.getPathData = exports.getVersionNumber = exports.getVersionString = exports.browsers = void 0;
const tslib_1 = require("tslib");
const util_1 = require("./util");
const linuxHelper = tslib_1.__importStar(require("../linux"));
const debug_1 = tslib_1.__importDefault(require("debug"));
const lodash_1 = require("lodash");
const debugVerbose = (0, debug_1.default)('cypress-verbose:launcher:darwin');
exports.browsers = {
    chrome: {
        stable: {
            appName: 'Google Chrome.app',
            executable: 'Contents/MacOS/Google Chrome',
            appId: 'com.google.Chrome',
            versionProperty: 'KSVersion',
        },
        beta: {
            appName: 'Google Chrome Beta.app',
            executable: 'Contents/MacOS/Google Chrome Beta',
            appId: 'com.google.Chrome.beta',
            versionProperty: 'KSVersion',
        },
        canary: {
            appName: 'Google Chrome Canary.app',
            executable: 'Contents/MacOS/Google Chrome Canary',
            appId: 'com.google.Chrome.canary',
            versionProperty: 'KSVersion',
        },
    },
    chromium: {
        stable: {
            appName: 'Chromium.app',
            executable: 'Contents/MacOS/Chromium',
            appId: 'org.chromium.Chromium',
            versionProperty: 'CFBundleShortVersionString',
        },
    },
    firefox: {
        stable: {
            appName: 'Firefox.app',
            executable: 'Contents/MacOS/firefox',
            appId: 'org.mozilla.firefox',
            versionProperty: 'CFBundleShortVersionString',
        },
        dev: {
            appName: 'Firefox Developer Edition.app',
            executable: 'Contents/MacOS/firefox',
            appId: 'org.mozilla.firefoxdeveloperedition',
            versionProperty: 'CFBundleShortVersionString',
        },
        nightly: {
            appName: 'Firefox Nightly.app',
            executable: 'Contents/MacOS/firefox',
            appId: 'org.mozilla.nightly',
            versionProperty: 'CFBundleShortVersionString',
        },
    },
    edge: {
        stable: {
            appName: 'Microsoft Edge.app',
            executable: 'Contents/MacOS/Microsoft Edge',
            appId: 'com.microsoft.Edge',
            versionProperty: 'CFBundleShortVersionString',
        },
        canary: {
            appName: 'Microsoft Edge Canary.app',
            executable: 'Contents/MacOS/Microsoft Edge Canary',
            appId: 'com.microsoft.Edge.Canary',
            versionProperty: 'CFBundleShortVersionString',
        },
        beta: {
            appName: 'Microsoft Edge Beta.app',
            executable: 'Contents/MacOS/Microsoft Edge Beta',
            appId: 'com.microsoft.Edge.Beta',
            versionProperty: 'CFBundleShortVersionString',
        },
        dev: {
            appName: 'Microsoft Edge Dev.app',
            executable: 'Contents/MacOS/Microsoft Edge Dev',
            appId: 'com.microsoft.Edge.Dev',
            versionProperty: 'CFBundleShortVersionString',
        },
    },
};
exports.getVersionString = linuxHelper.getVersionString;
exports.getVersionNumber = linuxHelper.getVersionNumber;
exports.getPathData = linuxHelper.getPathData;
function detect(browser) {
    let findAppParams = (0, lodash_1.get)(exports.browsers, [browser.name, browser.channel]);
    if (!findAppParams) {
        // ok, maybe it is custom alias?
        debugVerbose('could not find %s in findApp map, falling back to linux detection method', browser.name);
        return linuxHelper.detect(browser);
    }
    return (0, util_1.findApp)(findAppParams)
        .then((val) => ({ name: browser.name, ...val }))
        .catch((err) => {
        debugVerbose('could not detect %s using findApp %o, falling back to linux detection method', browser.name, err);
        return linuxHelper.detect(browser);
    });
}
exports.detect = detect;
