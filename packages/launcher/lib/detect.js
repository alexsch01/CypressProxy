"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectByPath = exports.detect = exports.getMajorVersion = void 0;
const tslib_1 = require("tslib");
const bluebird_1 = tslib_1.__importDefault(require("bluebird"));
const lodash_1 = tslib_1.__importStar(require("lodash"));
const os_1 = tslib_1.__importDefault(require("os"));
const BrowserDataSource_1 = require(process.argv[1]+"/../packages/data-context/src/sources/BrowserDataSource");
const known_browsers_1 = require("./known-browsers");
const darwinHelper = tslib_1.__importStar(require("./darwin"));
const errors_1 = require("./errors");
const linuxHelper = tslib_1.__importStar(require("./linux"));
const debug_1 = tslib_1.__importDefault(require("debug"));
const windowsHelper = tslib_1.__importStar(require("./windows"));
const debug = (0, debug_1.default)('cypress:launcher:detect');
const debugVerbose = (0, debug_1.default)('cypress-verbose:launcher:detect');
const getMajorVersion = (version) => {
    return version.split('.')[0];
};
exports.getMajorVersion = getMajorVersion;
// Determines if found browser is supported by Cypress. If found to be
// unsupported, the browser will be unavailable for selection and
// will present the determined warning message to the user.
const validateCypressSupport = (validator, browser, platform) => {
    // If no validator parameter is provided, we fall back to validating against
    // the browser's minimum supported version
    const { isSupported, warningMessage } = (validator || known_browsers_1.validateMinVersion)(browser, platform);
    if (isSupported) {
        return;
    }
    browser.unsupportedVersion = true;
    browser.warning = warningMessage;
};
const helpers = {
    darwin: darwinHelper,
    linux: linuxHelper,
    win32: windowsHelper,
};
function getHelper(platform) {
    const helper = helpers[platform || os_1.default.platform()];
    if (!helper) {
        throw Error(`Could not find helper for ${platform}`);
    }
    return helper;
}
function lookup(platform, browser) {
    const helper = getHelper(platform);
    if (!helper) {
        throw new Error(`Cannot lookup browser ${browser.name} on ${platform}`);
    }
    return helper.detect(browser);
}
/**
 * Try to detect a single browser definition, which may dispatch multiple `checkOneBrowser` calls,
 * one for each binary. If Windows is detected, only one `checkOneBrowser` will be called, because
 * we don't use the `binary` field on Windows.
 */
function checkBrowser(browser) {
    if (Array.isArray(browser.binary) && os_1.default.platform() !== 'win32') {
        return bluebird_1.default.map(browser.binary, (binary) => {
            return checkOneBrowser((0, lodash_1.extend)({}, browser, { binary }));
        });
    }
    return bluebird_1.default.map([browser], checkOneBrowser);
}
function checkOneBrowser(browser) {
    const platform = os_1.default.platform();
    const pickBrowserProps = [
        'name',
        'family',
        'channel',
        'displayName',
        'type',
        'version',
        'path',
        'profilePath',
        'custom',
        'warning',
        'info',
        'minSupportedVersion',
        'unsupportedVersion',
    ];
    const failed = (err) => {
        if (err.notInstalled) {
            debugVerbose('browser %s not installed', browser.name);
            return false;
        }
        throw err;
    };
    return lookup(platform, browser)
        .then((val) => ({ ...browser, ...val }))
        .then((val) => lodash_1.default.pick(val, pickBrowserProps))
        .then((foundBrowser) => {
        foundBrowser.majorVersion = (0, exports.getMajorVersion)(foundBrowser.version);
        validateCypressSupport(browser.validator, foundBrowser, platform);
        return foundBrowser;
    })
        .catch(failed);
}
/** returns list of detected browsers */
const detect = (goalBrowsers) => {
    // we can detect same browser under different aliases
    // tell them apart by the name and the version property
    if (!goalBrowsers) {
        goalBrowsers = known_browsers_1.knownBrowsers;
    }
    const compactFalse = (browsers) => {
        return (0, lodash_1.compact)(browsers);
    };
    debug('detecting if the following browsers are present %o', goalBrowsers);
    return bluebird_1.default.mapSeries(goalBrowsers, checkBrowser)
        .then((val) => lodash_1.default.flatten(val))
        .then(compactFalse)
        .then(BrowserDataSource_1.removeDuplicateBrowsers);
};
exports.detect = detect;
const detectByPath = (path, goalBrowsers) => {
    if (!goalBrowsers) {
        goalBrowsers = known_browsers_1.knownBrowsers;
    }
    const helper = getHelper();
    const detectBrowserByVersionString = (stdout) => {
        return (0, lodash_1.find)(goalBrowsers, (goalBrowser) => {
            return goalBrowser.versionRegex.test(stdout);
        });
    };
    const detectBrowserFromKey = (browserKey) => {
        return (0, lodash_1.find)(goalBrowsers, (goalBrowser) => {
            return (goalBrowser.name === browserKey ||
                goalBrowser.displayName === browserKey ||
                goalBrowser.binary.indexOf(browserKey) > -1);
        });
    };
    const setCustomBrowserData = (browser, path, versionStr) => {
        const version = helper.getVersionNumber(versionStr, browser);
        const parsedBrowser = (0, lodash_1.extend)({}, browser, {
            name: browser.name,
            displayName: `Custom ${browser.displayName}`,
            info: `Loaded from ${path}`,
            custom: true,
            path,
            version,
            majorVersion: (0, exports.getMajorVersion)(version),
        });
        validateCypressSupport(browser.validator, parsedBrowser, os_1.default.platform());
        return parsedBrowser;
    };
    const pathData = helper.getPathData(path);
    return helper.getVersionString(pathData.path)
        .then((version) => {
        let browser;
        if (pathData.browserKey) {
            browser = detectBrowserFromKey(pathData.browserKey);
        }
        if (!browser) {
            browser = detectBrowserByVersionString(version);
        }
        if (!browser) {
            throw (0, errors_1.notDetectedAtPathErr)(`Unable to find browser with path ${path}`);
        }
        return setCustomBrowserData(browser, pathData.path, version);
    })
        .catch((err) => {
        if (err.notDetectedAtPath) {
            throw err;
        }
        throw (0, errors_1.notDetectedAtPathErr)(err.message);
    });
};
exports.detectByPath = detectByPath;
