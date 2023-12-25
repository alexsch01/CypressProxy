"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findApp = exports.mdfind = exports.parsePlist = void 0;
const tslib_1 = require("tslib");
const debug_1 = tslib_1.__importDefault(require("debug"));
const errors_1 = require("../errors");
const utils_1 = require("../utils");
const fs = tslib_1.__importStar(require("fs-extra"));
const path = tslib_1.__importStar(require("path"));
const plist = tslib_1.__importStar(require("plist"));
const debugVerbose = (0, debug_1.default)('cypress-verbose:launcher:darwin:util');
/** parses Info.plist file from given application and returns a property */
function parsePlist(p, property) {
    const pl = path.join(p, 'Contents', 'Info.plist');
    debugVerbose('reading property file "%s"', pl);
    const failed = (e) => {
        const msg = `Info.plist not found: ${pl}
    ${e.message}`;
        debugVerbose('could not read Info.plist %o', { pl, e });
        throw (0, errors_1.notInstalledErr)('', msg);
    };
    return fs
        .readFile(pl, 'utf8')
        .then(plist.parse)
        .then((val) => val[property])
        .then(String) // explicitly convert value to String type
        .catch(failed); // to make TS compiler happy
}
exports.parsePlist = parsePlist;
/** uses mdfind to find app using Ma app id like 'com.google.Chrome.canary' */
function mdfind(id) {
    const cmd = `mdfind 'kMDItemCFBundleIdentifier=="${id}"' | head -1`;
    debugVerbose('looking for bundle id %s using command: %s', id, cmd);
    const logFound = (str) => {
        debugVerbose('found %s at %s', id, str);
        return str;
    };
    const failedToFind = () => {
        debugVerbose('could not find %s', id);
        throw (0, errors_1.notInstalledErr)(id);
    };
    return utils_1.utils.execa(cmd)
        .then((val) => {
        return val.stdout;
    })
        .then((val) => {
        logFound(val);
        return val;
    })
        .catch(failedToFind);
}
exports.mdfind = mdfind;
function formApplicationPath(appName) {
    return path.join('/Applications', appName);
}
/** finds an application and its version */
function findApp({ appName, executable, appId, versionProperty }) {
    debugVerbose('looking for app %s id %s', executable, appId);
    const findVersion = (foundPath) => {
        return parsePlist(foundPath, versionProperty).then((version) => {
            debugVerbose('got plist: %o', { foundPath, version });
            return {
                path: path.join(foundPath, executable),
                version,
            };
        });
    };
    const tryMdFind = () => {
        return mdfind(appId).then(findVersion);
    };
    const tryFullApplicationFind = () => {
        const applicationPath = formApplicationPath(appName);
        debugVerbose('looking for application %s', applicationPath);
        return findVersion(applicationPath);
    };
    return tryMdFind().catch(tryFullApplicationFind);
}
exports.findApp = findApp;
