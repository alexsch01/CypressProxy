"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.detect = exports.getPathData = exports.getVersionNumber = exports.getVersionString = void 0;
const tslib_1 = require("tslib");
const debug_1 = tslib_1.__importDefault(require("debug"));
const errors_1 = require("../errors");
const utils_1 = require("../utils");
const os_1 = tslib_1.__importDefault(require("os"));
const fs_1 = require("fs");
const path_1 = tslib_1.__importDefault(require("path"));
const bluebird_1 = tslib_1.__importDefault(require("bluebird"));
const which_1 = tslib_1.__importDefault(require("which"));
const debug = (0, debug_1.default)('cypress:launcher:linux');
const debugVerbose = (0, debug_1.default)('cypress-verbose:launcher:linux');
async function isFirefoxSnap(binary) {
    try {
        return await bluebird_1.default.resolve((async () => {
            const binaryPath = await (0, which_1.default)(binary);
            // if the bin path or what it's symlinked to start with `/snap/bin`, it's a snap
            if (binaryPath.startsWith('/snap/bin/') || (await fs_1.promises.realpath(binaryPath)).startsWith('/snap/bin'))
                return true;
            // read the first 16kb, don't read the entire file into memory in case it is a binary
            const fd = await fs_1.promises.open(binaryPath, 'r');
            const { buffer, bytesRead } = await fd.read({ length: 16384 });
            await fd.close();
            return buffer.slice(0, bytesRead).toString('utf8').includes('exec /snap/bin/firefox');
        })())
            .timeout(30000);
    }
    catch (err) {
        debug('failed to check if Firefox is a snap, assuming it isn\'t %o', { err, binary });
        return false;
    }
}
function getLinuxBrowser(name, binary, versionRegex) {
    const foundBrowser = {
        name,
        path: binary,
    };
    const getVersion = (stdout) => {
        const m = versionRegex.exec(stdout);
        if (m) {
            return m[1];
        }
        debug('Could not extract version from stdout using regex: %o', {
            stdout,
            versionRegex,
        });
        throw (0, errors_1.notInstalledErr)(binary);
    };
    const logAndThrowError = (err) => {
        debugVerbose('Received error detecting browser binary: "%s" with error:', binary, err.message);
        throw (0, errors_1.notInstalledErr)(binary);
    };
    const maybeSetSnapProfilePath = async (versionString) => {
        if (os_1.default.platform() !== 'linux')
            return;
        if (name === 'chromium' && versionString.endsWith('snap')) {
            // when running as a snap, chromium can only write to certain directories
            // @see https://github.com/cypress-io/cypress/issues/7020
            debug('chromium is running as a snap, changing profile path');
            foundBrowser.profilePath = path_1.default.join(os_1.default.homedir(), 'snap', 'chromium', 'current');
            return;
        }
        if (name === 'firefox' && (await isFirefoxSnap(binary))) {
            // if the binary in the path points to a script that calls the snap, set a snap-specific profile path
            // @see https://github.com/cypress-io/cypress/issues/19793
            debug('firefox is running as a snap, changing profile path');
            foundBrowser.profilePath = path_1.default.join(os_1.default.homedir(), 'snap', 'firefox', 'current');
            return;
        }
    };
    return getVersionString(binary)
        .tap(maybeSetSnapProfilePath)
        .then(getVersion)
        .then((version) => {
        foundBrowser.version = version;
        return foundBrowser;
    })
        .catch(logAndThrowError);
}
function getVersionString(path) {
    debugVerbose('finding version string using command "%s --version"', path);
    return bluebird_1.default.resolve(utils_1.utils.getOutput(path, ['--version']))
        .timeout(30000, `Timed out after 30 seconds getting browser version for ${path}`)
        .then((val) => val.stdout)
        .then((val) => val.trim())
        .then((val) => {
        debugVerbose('stdout for "%s --version": %s', path, val);
        return val;
    });
}
exports.getVersionString = getVersionString;
function getVersionNumber(version, browser) {
    var _a;
    const regexExec = browser.versionRegex.exec(version);
    return (_a = (regexExec && regexExec[1])) !== null && _a !== void 0 ? _a : version;
}
exports.getVersionNumber = getVersionNumber;
function getPathData(pathStr) {
    return { path: pathStr };
}
exports.getPathData = getPathData;
function detect(browser) {
    return getLinuxBrowser(browser.name, browser.binary, browser.versionRegex);
}
exports.detect = detect;
