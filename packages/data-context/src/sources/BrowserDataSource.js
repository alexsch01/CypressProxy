"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BrowserDataSource = exports.removeDuplicateBrowsers = void 0;
const tslib_1 = require("tslib");
const execa_1 = tslib_1.__importDefault(require("execa"));
const lodash_1 = tslib_1.__importDefault(require("lodash"));
const os_1 = tslib_1.__importDefault(require("os"));
let isPowerShellAvailable;
let powerShellPromise;
// Only need to worry about checking for PowerShell in windows,
// doing it asynchronously so to not block startup
if (os_1.default.platform() === 'win32') {
    powerShellPromise = (0, execa_1.default)(`[void] ''`, { shell: 'powershell' }).then(() => {
        isPowerShellAvailable = true;
    }).catch(() => {
        // Powershell is unavailable
        isPowerShellAvailable = false;
    }).finally(() => {
        powerShellPromise = undefined;
    });
}
const platform = os_1.default.platform();
function getBrowserKey(browser) {
    return `${browser.name}-${browser.version}`;
}
function removeDuplicateBrowsers(browsers) {
    return lodash_1.default.uniqBy(browsers, getBrowserKey);
}
exports.removeDuplicateBrowsers = removeDuplicateBrowsers;
class BrowserDataSource {
    constructor(ctx) {
        this.ctx = ctx;
    }
    /**
     * Gets the browsers from the machine and the project config
     */
    async allBrowsers() {
        if (this.ctx.coreData.allBrowsers) {
            return this.ctx.coreData.allBrowsers;
        }
        const p = await this.ctx.project.getConfig();
        const machineBrowsers = await this.machineBrowsers();
        if (!p.browsers) {
            this.ctx.coreData.allBrowsers = Promise.resolve(machineBrowsers);
            return this.ctx.coreData.allBrowsers;
        }
        const userBrowsers = p.browsers.reduce((acc, b) => {
            if (lodash_1.default.includes(lodash_1.default.map(machineBrowsers, getBrowserKey), getBrowserKey(b)))
                return acc;
            return [...acc, {
                    ...b,
                    majorVersion: String(b.majorVersion),
                    custom: true,
                }];
        }, []);
        this.ctx.coreData.allBrowsers = Promise.resolve(lodash_1.default.concat(machineBrowsers, userBrowsers));
        return this.ctx.coreData.allBrowsers;
    }
    /**
     * Gets the browsers from the machine, caching the Promise on the coreData
     * so we only look them up once
     */
    machineBrowsers() {
        if (this.ctx.coreData.machineBrowsers) {
            return this.ctx.coreData.machineBrowsers;
        }
        const p = this.ctx._apis.browserApi.getBrowsers();
        return this.ctx.coreData.machineBrowsers = p.then(async (browsers) => {
            if (!browsers[0])
                throw new Error('no browsers found in machineBrowsers');
            return browsers;
        }).catch((e) => {
            this.ctx.update((coreData) => {
                coreData.machineBrowsers = null;
                coreData.diagnostics.error = e;
            });
            throw e;
        });
    }
    idForBrowser(obj) {
        return `${obj.name}-${obj.family}-${obj.channel}`;
    }
    isSelected(obj) {
        if (!this.ctx.coreData.activeBrowser) {
            return false;
        }
        return this.idForBrowser(this.ctx.coreData.activeBrowser) === this.idForBrowser(obj);
    }
    async isFocusSupported(obj) {
        if (obj.family !== 'firefox') {
            return true;
        }
        // Only allow focusing if PowerShell is available on Windows, since that's what we use to do it
        if (platform === 'win32') {
            if (powerShellPromise) {
                await powerShellPromise;
            }
            return isPowerShellAvailable !== null && isPowerShellAvailable !== void 0 ? isPowerShellAvailable : false;
        }
        return false;
    }
    isVersionSupported(obj) {
        return Boolean(!obj.unsupportedVersion);
    }
}
exports.BrowserDataSource = BrowserDataSource;
