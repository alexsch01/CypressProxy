"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const lodash_1 = tslib_1.__importDefault(require("lodash"));
const mobx_react_1 = require("mobx-react");
const react_1 = tslib_1.__importDefault(require("react"));
const file_name_opener_1 = tslib_1.__importDefault(require("../lib/file-name-opener"));
const cypressLineRegex = /(cypress:\/\/|cypress_runner\.js)/;
const isMessageLine = (stackLine) => {
    return stackLine.message != null;
};
const ErrorStack = (0, mobx_react_1.observer)(({ err }) => {
    if (!err.parsedStack)
        return react_1.default.createElement(react_1.default.Fragment, null, err.stack);
    // only display stack lines beyond the original message, since it's already
    // displayed above this in the UI
    let foundFirstStackLine = false;
    const stackLines = lodash_1.default.filter(err.parsedStack, (line) => {
        if (foundFirstStackLine)
            return true;
        if (isMessageLine(line))
            return false;
        foundFirstStackLine = true;
        return true;
    });
    // instead of having every line indented, get rid of the smallest amount of
    // whitespace common to each line so the stack is aligned left but lines
    // with extra whitespace still have it
    const whitespaceLengths = lodash_1.default.map(stackLines, ({ whitespace }) => whitespace ? whitespace.length : 0);
    const commonWhitespaceLength = Math.min(...whitespaceLengths);
    const makeLine = (key, content) => {
        return (react_1.default.createElement("div", { className: 'err-stack-line', key: key }, content));
    };
    let stopLinking = false;
    const lines = lodash_1.default.map(stackLines, (stackLine, index) => {
        const whitespace = stackLine.whitespace.slice(commonWhitespaceLength);
        if (isMessageLine(stackLine)) {
            const message = stackLine.message;
            // we append some errors with 'node internals', which we don't want to link
            // so stop linking anything after 'From Node.js Internals'
            if (message.includes('From Node')) {
                stopLinking = true;
            }
            return makeLine(`${message}${index}`, [whitespace, message]);
        }
        const { originalFile, function: fn, line, column, absoluteFile } = stackLine;
        const key = `${originalFile}${index}`;
        const dontLink = (
        // don't link to Node files, opening them in IDE won't work
        stopLinking
            // sometimes we can determine the file on disk, but if there are no
            // source maps or the file was transpiled in the browser, there
            // is no absoluteFile to link to
            || !absoluteFile
            // don't link to cypress internals, opening them in IDE won't work
            || cypressLineRegex.test(originalFile || ''));
        if (dontLink) {
            const lineAndColumn = (Number.isInteger(line) || Number.isInteger(column)) ? `:${line}:${column}` : '';
            return makeLine(key, [whitespace, `at ${fn} (${originalFile}${lineAndColumn})`]);
        }
        const link = (react_1.default.createElement(file_name_opener_1.default, { key: key, className: "runnable-err-file-path", fileDetails: stackLine }));
        return makeLine(key, [whitespace, `at ${fn} (`, link, ')']);
    });
    return react_1.default.createElement(react_1.default.Fragment, null, lines);
});
exports.default = ErrorStack;
