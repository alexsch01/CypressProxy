"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BrowserActions = void 0;
class BrowserActions {
    constructor(ctx) {
        this.ctx = ctx;
    }
    get browserApi() {
        return this.ctx._apis.browserApi;
    }
    closeBrowser() {
        return this.browserApi.close();
    }
    setActiveBrowserById(id) {
        var _a;
        const browserId = this.ctx.fromId(id, 'Browser');
        const browser = (_a = this.ctx.lifecycleManager.browsers) === null || _a === void 0 ? void 0 : _a.find((b) => this.ctx.browser.idForBrowser(b) === browserId);
        if (!browser) {
            throw new Error('no browser in setActiveBrowserById');
        }
        this.setActiveBrowser(browser);
    }
    setActiveBrowser(browser) {
        if (this.ctx.coreData.activeBrowser === browser) {
            return;
        }
        this.ctx.update((d) => {
            d.activeBrowser = browser;
        });
        this.ctx._apis.projectApi.insertProjectPreferencesToCache(this.ctx.lifecycleManager.projectTitle, {
            lastBrowser: {
                name: browser.name,
                channel: browser.channel,
            },
        });
    }
    async focusActiveBrowserWindow() {
        await this.browserApi.focusActiveBrowserWindow();
    }
    async relaunchBrowser() {
        await this.browserApi.relaunchBrowser();
    }
}
exports.BrowserActions = BrowserActions;
