"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LegacyPluginsIpc = void 0;
const tslib_1 = require("tslib");
const events_1 = tslib_1.__importDefault(require("events"));
class LegacyPluginsIpc extends events_1.default {
    constructor(childProcess) {
        super();
        this.childProcess = childProcess;
        childProcess.on('message', (msg) => {
            this.emit(msg.event, ...msg.args);
        });
        childProcess.once('disconnect', () => {
            this.emit('disconnect');
        });
    }
    send(event, ...args) {
        if (this.childProcess.killed || !this.childProcess.connected) {
            return false;
        }
        return this.childProcess.send({ event, args });
    }
    on(evt, listener) {
        return super.on(evt, listener);
    }
    killChildProcess() {
        var _a, _b;
        this.childProcess.kill();
        (_a = this.childProcess.stdout) === null || _a === void 0 ? void 0 : _a.removeAllListeners();
        (_b = this.childProcess.stderr) === null || _b === void 0 ? void 0 : _b.removeAllListeners();
        this.childProcess.removeAllListeners();
        this.removeAllListeners();
    }
}
exports.LegacyPluginsIpc = LegacyPluginsIpc;
