"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorDataSource = void 0;
const tslib_1 = require("tslib");
const errors_1 = require(process.argv[1]+"/../packages/errors");
const path_1 = tslib_1.__importDefault(require("path"));
const lodash_1 = tslib_1.__importDefault(require("lodash"));
const code_frame_1 = require("@babel/code-frame");
class ErrorDataSource {
    constructor(ctx) {
        this.ctx = ctx;
    }
    isUserCodeError(source) {
        var _a;
        return Boolean(source.cypressError.originalError && !((_a = source.cypressError.originalError) === null || _a === void 0 ? void 0 : _a.isCypressErr));
    }
    async codeFrame(source) {
        var _a, _b, _c;
        if (!this.ctx.currentProject || !this.isUserCodeError(source)) {
            return null;
        }
        // If we saw a TSError,  or a esbuild error we will extract the error location from the message
        const compilerErrorLocation = (_a = source.cypressError.originalError) === null || _a === void 0 ? void 0 : _a.compilerErrorLocation;
        let line;
        let column;
        let absolute;
        if (compilerErrorLocation) {
            line = compilerErrorLocation.line;
            column = compilerErrorLocation.column;
            absolute = path_1.default.join(this.ctx.currentProject, compilerErrorLocation.filePath);
        }
        else {
            // Skip any stack trace lines which come from node:internal code
            const stackLines = errors_1.stackUtils.getStackLines((_b = source.cypressError.stack) !== null && _b !== void 0 ? _b : '');
            const filteredStackLines = stackLines.filter((stackLine) => !stackLine.includes('node:electron') && !stackLine.includes('node:internal') && !stackLine.includes('source-map-support'));
            const parsedLine = errors_1.stackUtils.parseStackLine((_c = filteredStackLines[0]) !== null && _c !== void 0 ? _c : '');
            if (parsedLine) {
                absolute = parsedLine.absolute;
                line = parsedLine.line;
                column = parsedLine.column;
            }
        }
        if (!absolute || !lodash_1.default.isNumber(line) || !lodash_1.default.isNumber(column)) {
            return null;
        }
        const codeBlock = (0, code_frame_1.codeFrameColumns)(await this.ctx.fs.readFile(absolute, 'utf8'), {
            start: { line, column },
        }, {
            linesAbove: 2,
            linesBelow: 4,
        });
        return {
            absolute,
            line,
            column,
            codeBlock,
        };
    }
}
exports.ErrorDataSource = ErrorDataSource;
