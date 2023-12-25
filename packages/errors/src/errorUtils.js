"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logError = exports.trimMultipleNewLines = exports.isCypressErr = exports.parseResolvedPattern = exports.humanTime = exports.pluralize = void 0;
const tslib_1 = require("tslib");
/* eslint-disable no-console */
const chalk_1 = tslib_1.__importDefault(require("chalk"));
const lodash_1 = tslib_1.__importDefault(require("lodash"));
const path_1 = tslib_1.__importDefault(require("path"));
const pluralize = require('pluralize');
exports.pluralize = pluralize;
const humanTime = require(process.argv[1]+'/../packages/server/lib/util/human_time');
exports.humanTime = humanTime;
const whileMatching = (othArr) => {
    return (val, index) => {
        return val === othArr[index];
    };
};
const parseResolvedPattern = (baseFolder, globPattern) => {
    const resolvedPath = path_1.default.resolve(baseFolder, globPattern);
    const resolvedPathParts = resolvedPath.split(path_1.default.sep);
    const folderPathPaths = baseFolder.split(path_1.default.sep);
    const commonPath = lodash_1.default.takeWhile(folderPathPaths, whileMatching(resolvedPathParts)).join(path_1.default.sep);
    const remainingPattern = !commonPath ? resolvedPath : resolvedPath.replace(commonPath.concat(path_1.default.sep), '');
    return [commonPath, remainingPattern];
};
exports.parseResolvedPattern = parseResolvedPattern;
const isCypressErr = (err) => {
    return Boolean(err.isCypressErr);
};
exports.isCypressErr = isCypressErr;
const twoOrMoreNewLinesRe = /\n{2,}/;
const trimMultipleNewLines = (str) => {
    return lodash_1.default
        .chain(str)
        .split(twoOrMoreNewLinesRe)
        .compact()
        .join('\n\n')
        .value();
};
exports.trimMultipleNewLines = trimMultipleNewLines;
/**
 *
 * @param err
 * @param color
 * @param causeDepth If error has a `cause` limits the maximum depth of causes to log. Set to `0` to not log any `cause`
 * @returns
 */
const logError = function (err, color = 'red', causeDepth = 3) {
    var _a;
    console.log(chalk_1.default[color](err.message));
    if (err.details) {
        console.log(chalk_1.default.magenta(`\n${err.details}`));
    }
    // bail if this error came from known
    // list of Cypress errors
    if ((0, exports.isCypressErr)(err)) {
        return;
    }
    console.log(chalk_1.default[color]((_a = err.stack) !== null && _a !== void 0 ? _a : ''));
    if (causeDepth > 0 && err['cause']) {
        // Limit the recursions on `cause` in case there is a loop
        console.log(chalk_1.default[color]('Caused by:'));
        (0, exports.logError)(err['cause'], color, causeDepth - 1);
    }
    return err;
};
exports.logError = logError;
