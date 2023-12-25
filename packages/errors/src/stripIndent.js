"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stripIndent = void 0;
const stripIndent = (strings, ...args) => {
    var _a, _b;
    const parts = [];
    for (let i = 0; i < strings.length; i++) {
        parts.push(strings[i]);
        if (i < strings.length - 1) {
            parts.push(`<<${i}>>`);
        }
    }
    const lines = parts.join('').split('\n');
    const firstLine = (_b = (((_a = lines[0]) === null || _a === void 0 ? void 0 : _a.length) === 0 ? lines[1] : lines[0])) !== null && _b !== void 0 ? _b : '';
    let indentSize = 0;
    for (let i = 0; i < firstLine.length; i++) {
        if (firstLine[i] === ' ') {
            indentSize++;
            continue;
        }
        break;
    }
    const strippedLines = lines.map((line) => line.substring(indentSize));
    let result = strippedLines.join('\n').trimLeft();
    args.forEach((arg, i) => {
        result = result.replace(`<<${i}>>`, `${arg}`);
    });
    return result;
};
exports.stripIndent = stripIndent;
