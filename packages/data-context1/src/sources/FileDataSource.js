"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileDataSource = exports.matchGlobs = void 0;
const tslib_1 = require("tslib");
const assert_1 = tslib_1.__importDefault(require("assert"));
const path = tslib_1.__importStar(require("path"));
const os_1 = tslib_1.__importDefault(require("os"));
const globby_1 = tslib_1.__importDefault(require("globby"));
const debug_1 = tslib_1.__importDefault(require("debug"));
const file_1 = require("../util/file");
const debug = (0, debug_1.default)('cypress:data-context:sources:FileDataSource');
const matchGlobs = async (globs, globbyOptions) => {
    return await (0, globby_1.default)(globs, globbyOptions);
};
exports.matchGlobs = matchGlobs;
class FileDataSource {
    constructor(ctx) {
        this.ctx = ctx;
    }
    async checkIfFileExists(relativePath) {
        (0, assert_1.default)(this.ctx.currentProject, `Cannot checkIfFileExists without active project`);
        const filePath = path.join(this.ctx.currentProject, relativePath);
        try {
            return await this.ctx.fs.stat(filePath);
        }
        catch (_a) {
            return null;
        }
    }
    async readFileInProject(relative) {
        (0, assert_1.default)(this.ctx.currentProject, `Cannot readFileInProject without active project`);
        return this.ctx.fs.readFile(path.join(this.ctx.currentProject, relative), 'utf-8');
    }
    async getFilesByGlob(cwd, glob, globOptions = {}) {
        var _a;
        const globs = [].concat(glob).map((globPattern) => {
            const workingDirectoryPrefix = path.join(cwd, path.sep);
            // If the pattern includes the working directory, we strip it from the pattern.
            // The working directory path may include characters that conflict with glob
            // syntax (brackets, parentheses, etc.) and cause our searches to inadvertently fail.
            // We scope our search to the working directory using the `cwd` globby option.
            if (globPattern.startsWith(workingDirectoryPrefix)) {
                return globPattern.replace(workingDirectoryPrefix, '');
            }
            return globPattern;
        });
        const ignoreGlob = ((_a = globOptions.ignore) !== null && _a !== void 0 ? _a : []).concat('**/node_modules/**');
        if (os_1.default.platform() === 'win32') {
            // globby can't work with backwards slashes
            // https://github.com/sindresorhus/globby/issues/179
            debug('updating glob patterns to POSIX');
            for (const i in globs) {
                const cur = globs[i];
                if (!cur)
                    throw new Error('undefined glob received');
                globs[i] = (0, file_1.toPosix)(cur);
            }
        }
        try {
            debug('globbing pattern(s): %o', globs);
            debug('within directory: %s', cwd);
            const files = await (0, exports.matchGlobs)(globs, { onlyFiles: true, absolute: true, cwd, ...globOptions, ignore: ignoreGlob });
            return files;
        }
        catch (e) {
            if (!globOptions.suppressErrors) {
                // Log error and retry with filesystem errors suppressed - this allows us to find partial
                // results even if the glob search hits permission issues (#24109)
                debug('Error in getFilesByGlob %o, retrying with filesystem errors suppressed', e);
                return await this.getFilesByGlob(cwd, glob, { ...globOptions, suppressErrors: true });
            }
            debug('Non-suppressible error in getFilesByGlob %o', e);
            return [];
        }
    }
}
exports.FileDataSource = FileDataSource;
