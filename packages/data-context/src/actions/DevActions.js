"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DevActions = void 0;
const tslib_1 = require("tslib");
const path_1 = tslib_1.__importDefault(require("path"));
const chokidar_1 = tslib_1.__importDefault(require("chokidar"));
class DevActions {
    static get CY_STATE_PATH() {
        return path_1.default.join(__dirname, '../..', 'node_modules', '.cystate');
    }
    static get CY_TRIGGER_UPDATE() {
        return path_1.default.join(__dirname, '../..', 'node_modules', '.cystate-update');
    }
    constructor(ctx) {
        this.ctx = ctx;
    }
    watchForRelaunch() {
        // When we see changes to the .cystate file, we trigger a notification to the frontend
        if (!this._chokidar) {
            this._chokidar = chokidar_1.default.watch(DevActions.CY_STATE_PATH, {
                ignoreInitial: true,
                ignorePermissionErrors: true,
            });
            this._chokidar.on('change', () => {
                this.ctx.coreData.dev.refreshState = new Date().toISOString();
                this.ctx.emitter.devChange();
            });
        }
    }
    // In a setTimeout so that we flush the triggering response to the client before sending
    triggerRelaunch() {
        setTimeout(async () => {
            try {
                await this.ctx.destroy();
            }
            catch (e) {
                this.ctx.logTraceError(e);
            }
            finally {
                process.exitCode = 0;
                await this.ctx.fs.writeFile(DevActions.CY_TRIGGER_UPDATE, JSON.stringify(new Date()));
            }
        }, 10);
    }
    dismissRelaunch() {
        this.ctx.coreData.dev.refreshState = null;
    }
    dispose() {
        var _a;
        (_a = this._chokidar) === null || _a === void 0 ? void 0 : _a.close().catch(() => { });
        this._chokidar = undefined;
    }
}
exports.DevActions = DevActions;
