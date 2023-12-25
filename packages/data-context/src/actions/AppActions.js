"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppActions = void 0;
class AppActions {
    constructor(ctx) {
        this.ctx = ctx;
    }
    async removeAppDataDir() {
        await this.ctx._apis.appApi.appData.remove();
    }
    async ensureAppDataDirExists() {
        await this.ctx._apis.appApi.appData.ensure();
    }
    setBrowserStatus(browserStatus) {
        this.ctx.update((d) => {
            d.app.browserStatus = browserStatus;
            // when we close the browser null out the user agent
            if (browserStatus === 'closed') {
                d.app.browserUserAgent = null;
            }
        });
        this.ctx.emitter.browserStatusChange();
    }
    setBrowserUserAgent(userAgent) {
        this.ctx.update((d) => {
            d.app.browserUserAgent = userAgent || null;
        });
    }
}
exports.AppActions = AppActions;
