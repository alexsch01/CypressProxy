"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toPosix = void 0;
const tslib_1 = require("tslib");
const path_1 = tslib_1.__importDefault(require("path"));
function toPosix(file, sep = path_1.default.sep) {
    return file.split(sep).join(path_1.default.posix.sep);
}
exports.toPosix = toPosix;
