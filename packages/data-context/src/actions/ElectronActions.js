"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ElectronActions = void 0;
const tslib_1 = require("tslib");
const os_1 = tslib_1.__importDefault(require("os"));
const lodash_1 = tslib_1.__importDefault(require("lodash"));
const path_1 = tslib_1.__importDefault(require("path"));
const assert_1 = tslib_1.__importDefault(require("assert"));
const debug_1 = tslib_1.__importDefault(require("debug"));
const debug = (0, debug_1.default)('cypress:data-context:ElectronActions');
// Declare notification variable globally so that it doesn't get garbage collected
// before the user clicks on the notification
const notifications = new Set();
class ElectronActions {
    constructor(ctx) {
        this.ctx = ctx;
    }
    get electron() {
        return this.ctx.coreData.electron;
    }
    get isMac() {
        return os_1.default.platform() === 'darwin';
    }
    setElectronApp(app) {
        this.electron.app = app;
    }
    setBrowserWindow(window) {
        this.electron.browserWindow = window;
    }
    showBrowserWindow() {
        var _a, _b, _c;
        (_a = this.electron.browserWindow) === null || _a === void 0 ? void 0 : _a.show();
        if (this.isMac) {
            (_b = this.ctx.config.electronApp) === null || _b === void 0 ? void 0 : _b.dock.show().catch((e) => {
                this.ctx.logTraceError(e);
            });
        }
        else {
            (_c = this.electron.browserWindow) === null || _c === void 0 ? void 0 : _c.setSkipTaskbar(false);
        }
    }
    showElectronOnAppExit() {
        this.refreshBrowserWindow();
        this.showBrowserWindow();
    }
    refreshBrowserWindow() {
        var _a;
        (_a = this.electron.browserWindow) === null || _a === void 0 ? void 0 : _a.reload();
    }
    openExternal(url) {
        this.ctx.config.electronApi.openExternal(url);
    }
    showItemInFolder(url) {
        this.ctx.config.electronApi.showItemInFolder(url);
    }
    showOpenDialog() {
        const props = {
            // we only want the user to select a single
            // directory. not multiple, and not files
            properties: ['openDirectory'],
        };
        return this.ctx.config.electronApi.showOpenDialog(props)
            .then((obj) => {
            // return the first path since there can only ever
            // be a single directory selection
            return lodash_1.default.get(obj, ['filePaths', 0]);
        });
    }
    showSaveDialog(integrationFolder) {
        // Do we want to attach browserWindow (?)
        (0, assert_1.default)(this.electron.browserWindow, 'Browser window is not set');
        const props = {
            defaultPath: path_1.default.join(integrationFolder, 'untitled.spec.js'),
            buttonLabel: 'Create File',
            showsTagField: false,
            filters: [{
                    name: 'JavaScript',
                    extensions: ['js'],
                }, {
                    name: 'TypeScript',
                    extensions: ['ts'],
                }, {
                    name: 'Other',
                    extensions: ['*'],
                }],
            properties: ['createDirectory', 'showOverwriteConfirmation'],
        };
        // attach to window so it displays as a modal rather than a standalone window
        return this.ctx.config.electronApi.showSaveDialog(this.electron.browserWindow, props).then((obj) => {
            return obj.filePath || null;
        });
    }
    showSystemNotification(title, body, onClick) {
        const notification = this.ctx.config.electronApi.createNotification(title, body);
        notifications.add(notification);
        debug('notification created %o', notification);
        function clickFn(event) {
            debug('notification clicked %o', event);
            onClick();
            notifications.delete(notification);
        }
        notification.on('click', clickFn);
        notification.show();
    }
}
exports.ElectronActions = ElectronActions;
