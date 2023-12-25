"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileActions = void 0;
const tslib_1 = require("tslib");
const path_1 = tslib_1.__importDefault(require("path"));
// @ts-ignore - no types available
const launch_editor_1 = tslib_1.__importDefault(require("launch-editor"));
const assert_1 = tslib_1.__importDefault(require("assert"));
class FileActions {
    constructor(ctx) {
        this.ctx = ctx;
    }
    async readFileInProject(relativePath) {
        if (!this.ctx.currentProject) {
            throw new Error(`Cannot write file in project without active project`);
        }
        const filePath = path_1.default.join(this.ctx.currentProject, relativePath);
        await this.ctx.fs.ensureDir(path_1.default.dirname(filePath));
        return this.ctx.fs.readFile(filePath, 'utf-8');
    }
    async writeFileInProject(relativePath, data) {
        if (!this.ctx.currentProject) {
            throw new Error(`Cannot write file in project without active project`);
        }
        const filePath = path_1.default.join(this.ctx.currentProject, relativePath);
        await this.ctx.fs.ensureDir(path_1.default.dirname(filePath));
        // Typically used in e2e tests, simpler than forcing async
        await this.ctx.fs.writeFile(filePath, data);
    }
    async removeFileInProject(relativePath) {
        if (!this.ctx.currentProject) {
            throw new Error(`Cannot remove file in project without active project`);
        }
        // Typically used in e2e tests, simpler than forcing async
        await this.ctx.fs.remove(path_1.default.join(this.ctx.currentProject, relativePath));
    }
    async moveFileInProject(relativePath, toRelativePath) {
        if (!this.ctx.currentProject) {
            throw new Error(`Cannot remove file in project without active project`);
        }
        // Typically used in e2e tests, simpler than forcing async
        await this.ctx.fs.move(path_1.default.join(this.ctx.currentProject, relativePath), path_1.default.join(this.ctx.currentProject, toRelativePath));
    }
    openFile(filePath, line = 1, column = 1) {
        (0, assert_1.default)(this.ctx.currentProject);
        const binary = this.ctx.coreData.localSettings.preferences.preferredEditorBinary;
        const absolute = path_1.default.resolve(this.ctx.currentProject, filePath);
        if (!binary || !absolute) {
            this.ctx.debug('cannot open file without binary');
            return;
        }
        if (binary === 'computer') {
            try {
                this.ctx.actions.electron.showItemInFolder(absolute);
            }
            catch (err) {
                this.ctx.debug('error opening file: %s', err.stack);
            }
            return;
        }
        (0, launch_editor_1.default)(`${absolute}:${line}:${column}`, `"${binary}"`, (__, errMsg) => {
            this.ctx.debug('error opening file: %s', errMsg);
        });
    }
}
exports.FileActions = FileActions;
