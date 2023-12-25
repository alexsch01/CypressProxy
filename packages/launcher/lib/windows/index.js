"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.detect = exports.getPathData = exports.getVersionNumber = exports.getVersionString = exports.doubleEscape = void 0;
const tslib_1 = require("tslib");
const fse = tslib_1.__importStar(require("fs-extra"));
const win_version_info_1 = tslib_1.__importDefault(require("win-version-info"));
const os_1 = tslib_1.__importDefault(require("os"));
const path_1 = require("path");
const lodash_1 = require("lodash");
const errors_1 = require("../errors");
const debug_1 = tslib_1.__importDefault(require("debug"));
const debug = (0, debug_1.default)('cypress:launcher:windows');
const debugVerbose = (0, debug_1.default)('cypress-verbose:launcher:windows');
function formFullAppPath(name) {
    return [
        `C:/Program Files (x86)/Google/Chrome/Application/${name}.exe`,
        `C:/Program Files/Google/Chrome/Application/${name}.exe`,
    ].map(path_1.normalize);
}
function formChromeBetaAppPath() {
    return [
        'C:/Program Files (x86)/Google/Chrome Beta/Application/chrome.exe',
        'C:/Program Files/Google/Chrome Beta/Application/chrome.exe',
    ].map(path_1.normalize);
}
function formChromiumAppPath() {
    const exe = 'C:/Program Files (x86)/Google/chrome-win32/chrome.exe';
    return [(0, path_1.normalize)(exe)];
}
function formChromeCanaryAppPath() {
    const home = os_1.default.homedir();
    const exe = (0, path_1.join)(home, 'AppData', 'Local', 'Google', 'Chrome SxS', 'Application', 'chrome.exe');
    return [(0, path_1.normalize)(exe)];
}
function getFirefoxPaths(editionFolder) {
    return () => {
        return (['Program Files', 'Program Files (x86)'])
            .map((programFiles) => {
            return (0, path_1.normalize)(`C:/${programFiles}/${editionFolder}/firefox.exe`);
        })
            .concat((0, path_1.normalize)((0, path_1.join)(os_1.default.homedir(), 'AppData', 'Local', editionFolder, 'firefox.exe')));
    };
}
function formEdgeCanaryAppPath() {
    const home = os_1.default.homedir();
    const exe = (0, path_1.join)(home, 'AppData', 'Local', 'Microsoft', 'Edge SxS', 'Application', 'msedge.exe');
    return [(0, path_1.normalize)(exe)];
}
const formPaths = {
    chrome: {
        stable: formFullAppPath,
        beta: formChromeBetaAppPath,
        canary: formChromeCanaryAppPath,
    },
    chromium: {
        stable: formChromiumAppPath,
    },
    firefox: {
        stable: getFirefoxPaths('Mozilla Firefox'),
        dev: getFirefoxPaths('Firefox Developer Edition'),
        nightly: getFirefoxPaths('Firefox Nightly'),
    },
    edge: {
        stable: () => {
            return [(0, path_1.normalize)('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe')];
        },
        beta: () => {
            return [(0, path_1.normalize)('C:/Program Files (x86)/Microsoft/Edge Beta/Application/msedge.exe')];
        },
        dev: () => {
            return [(0, path_1.normalize)('C:/Program Files (x86)/Microsoft/Edge Dev/Application/msedge.exe')];
        },
        canary: formEdgeCanaryAppPath,
    },
};
function getWindowsBrowser(browser) {
    const formFullAppPathFn = (0, lodash_1.get)(formPaths, [browser.name, browser.channel], formFullAppPath);
    const exePaths = formFullAppPathFn(browser.name);
    debugVerbose('looking at possible paths... %o', { browser, exePaths });
    // shift and try paths 1-by-1 until we find one that works
    const tryNextExePath = async () => {
        const exePath = exePaths.shift();
        if (!exePath) {
            // exhausted available paths
            throw (0, errors_1.notInstalledErr)(browser.name);
        }
        let path = doubleEscape(exePath);
        return fse.pathExists(path)
            .then((exists) => {
            debugVerbose('found %s ? %o', path, { exists });
            if (!exists) {
                return tryNextExePath();
            }
            // Use module.exports.getVersionString here, rather than our local reference
            // to that variable so that the tests can easily mock it
            return module.exports.getVersionString(path).then((version) => {
                debug('got version string for %s: %o', browser.name, { exePath, version });
                return {
                    name: browser.name,
                    version,
                    path: exePath,
                };
            });
        })
            .catch((err) => {
            debug('error while looking up exe, trying next exePath %o', { exePath, exePaths, err });
            return tryNextExePath();
        });
    };
    return tryNextExePath();
}
function doubleEscape(s) {
    // Converts all types of paths into windows supported double backslash path
    // Handles any number of \\ in the given path
    return path_1.win32.join(...s.split(path_1.win32.sep)).replace(/\\/g, '\\\\');
}
exports.doubleEscape = doubleEscape;
function getVersionString(path) {
    // on Windows using "--version" seems to always start the full
    // browser, no matter what one does.
    try {
        return Promise.resolve((0, win_version_info_1.default)(path).FileVersion);
    }
    catch (err) {
        return Promise.reject(err);
    }
}
exports.getVersionString = getVersionString;
function getVersionNumber(version) {
    if (version.indexOf('Version=') > -1) {
        const split = version.split('=');
        if (split[1]) {
            return split[1];
        }
    }
    return version;
}
exports.getVersionNumber = getVersionNumber;
function getPathData(pathStr) {
    const test = new RegExp(/^.+\.exe:(.+)$/);
    const res = test.exec(pathStr);
    let browserKey = '';
    let path = pathStr;
    if (res) {
        const pathParts = path.split(':');
        browserKey = pathParts.pop() || '';
        path = doubleEscape(pathParts.join(':'));
        return { path, browserKey };
    }
    path = doubleEscape(path);
    if (pathStr.indexOf('chrome.exe') > -1) {
        return { path, browserKey: 'chrome' };
    }
    if (pathStr.indexOf('edge.exe') > -1) {
        return { path, browserKey: 'edge' };
    }
    if (pathStr.indexOf('firefox.exe') > -1) {
        return { path, browserKey: 'firefox' };
    }
    return { path };
}
exports.getPathData = getPathData;
function detect(browser) {
    return getWindowsBrowser(browser);
}
exports.detect = detect;
