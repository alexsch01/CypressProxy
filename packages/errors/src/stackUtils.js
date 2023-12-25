"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.replacedStack = exports.stackWithoutMessage = exports.parseStackLine = exports.getStackLines = exports.unsplitStack = exports.splitStack = exports.stackLineRegex = void 0;
const tslib_1 = require("tslib");
const lodash_1 = tslib_1.__importDefault(require("lodash"));
exports.stackLineRegex = /^\s*(at )?.*@?(?:\(?.*(?::\d+:\d+|<unknown>|\[native code\])+\)?)$/;
// returns tuple of [message, stack]
const splitStack = (stack) => {
    const lines = stack.split('\n');
    return lodash_1.default.reduce(lines, (memo, line) => {
        if (memo.messageEnded || exports.stackLineRegex.test(line)) {
            memo.messageEnded = true;
            memo[1].push(line);
        }
        else {
            memo[0].push(line);
        }
        return memo;
    }, [[], []]);
};
exports.splitStack = splitStack;
const unsplitStack = (messageLines, stackLines) => {
    return lodash_1.default.castArray(messageLines).concat(stackLines).join('\n');
};
exports.unsplitStack = unsplitStack;
const getStackLines = (stack) => {
    const [, stackLines] = (0, exports.splitStack)(stack);
    return stackLines;
};
exports.getStackLines = getStackLines;
/**
 * Captures & returns the absolute path, line, and column from a stack trace line
 */
const parseStackLine = (line) => {
    const stackLineCapture = /^\s*(?:at )?.*@?\((.*?)\:(\d+)\:(\d+)\)?$/;
    const result = stackLineCapture.exec(line);
    if (!(result === null || result === void 0 ? void 0 : result[1])) {
        return null;
    }
    return { absolute: result[1], line: Number(result[2]), column: Number(result[3]) };
};
exports.parseStackLine = parseStackLine;
/**
 * Takes the stack and returns only the lines that contain stack-frame like entries,
 * matching the `stackLineRegex` above
 */
const stackWithoutMessage = (stack) => {
    return (0, exports.getStackLines)(stack).join('\n');
};
exports.stackWithoutMessage = stackWithoutMessage;
const replacedStack = (err, newStack) => {
    // if err already lacks a stack or we've removed the stack
    // for some reason, keep it stackless
    if (!err.stack)
        return err.stack;
    const errString = err.toString();
    const stackLines = (0, exports.getStackLines)(newStack);
    return (0, exports.unsplitStack)(errString, stackLines);
};
exports.replacedStack = replacedStack;
