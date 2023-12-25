"use strict";
const tslib_1 = require("tslib");
const lodash_1 = tslib_1.__importDefault(require("lodash"));
const events_1 = tslib_1.__importDefault(require("events"));
const path_1 = tslib_1.__importDefault(require("path"));
const debug_1 = tslib_1.__importDefault(require("debug"));
const menu_1 = tslib_1.__importDefault(require("../gui/menu"));
const Windows = tslib_1.__importStar(require("../gui/windows"));
const cdp_automation_1 = require("./cdp_automation");
const savedState = tslib_1.__importStar(require("../saved_state"));
const utils_1 = tslib_1.__importDefault(require("./utils"));
const errors = tslib_1.__importStar(require("../errors"));
const memory_1 = tslib_1.__importDefault(require("./memory"));
const browser_cri_client_1 = require("./browser-cri-client");
const electron_app_1 = require("../util/electron-app");
const debug = (0, debug_1.default)('cypress:server:browsers:electron');
// additional events that are nice to know about to be logged
// https://electronjs.org/docs/api/browser-window#instance-events
const ELECTRON_DEBUG_EVENTS = [
    'close',
    'responsive',
    'session-end',
    'unresponsive',
];
let instance = null;
let browserCriClient = null;
const tryToCall = function (win, method) {
    try {
        if (!win.isDestroyed()) {
            if (lodash_1.default.isString(method)) {
                return win[method]();
            }
            return method();
        }
    }
    catch (err) {
        return debug('got error calling window method:', err.stack);
    }
};
const _getAutomation = async function (win, options, parent) {
    if (!options.onError)
        throw new Error('Missing onError in electron#_launch');
    const port = (0, electron_app_1.getRemoteDebuggingPort)();
    if (!browserCriClient) {
        browserCriClient = await browser_cri_client_1.BrowserCriClient.create({ hosts: ['127.0.0.1'], port, browserName: 'electron', onAsynchronousError: options.onError, onReconnect: () => { }, fullyManageTabs: true });
    }
    const pageCriClient = await browserCriClient.attachToTargetUrl('about:blank');
    const sendClose = async () => {
        if (browserCriClient) {
            const gracefulShutdown = true;
            await browserCriClient.close(gracefulShutdown);
        }
        win.destroy();
    };
    const automation = await cdp_automation_1.CdpAutomation.create(pageCriClient.send, pageCriClient.on, pageCriClient.off, sendClose, parent);
    automation.onRequest = lodash_1.default.wrap(automation.onRequest, async (fn, message, data) => {
        switch (message) {
            case 'take:screenshot': {
                // after upgrading to Electron 8, CDP screenshots can hang if a screencast is not also running
                // workaround: start and stop screencasts between screenshots
                // @see https://github.com/cypress-io/cypress/pull/6555#issuecomment-596747134
                if (!options.videoApi) {
                    await pageCriClient.send('Page.startScreencast', (0, cdp_automation_1.screencastOpts)());
                    const ret = await fn(message, data);
                    await pageCriClient.send('Page.stopScreencast');
                    return ret;
                }
                return fn(message, data);
            }
            case 'focus:browser:window': {
                win.show();
                return;
            }
            default: {
                return fn(message, data);
            }
        }
    });
    return automation;
};
function _installExtensions(win, extensionPaths, options) {
    Windows.removeAllExtensions(win);
    return Promise.all(extensionPaths.map((extensionPath) => {
        try {
            return Windows.installExtension(win, extensionPath);
        }
        catch (error) {
            return options.onWarning(errors.get('EXTENSION_NOT_LOADED', 'Electron', extensionPath));
        }
    }));
}
async function recordVideo(cdpAutomation, videoApi) {
    const { writeVideoFrame } = await videoApi.useFfmpegVideoController();
    await cdpAutomation.startVideoRecording(writeVideoFrame, (0, cdp_automation_1.screencastOpts)());
}
module.exports = {
    _defaultOptions(projectRoot, state, options, automation) {
        const _this = this;
        const defaults = {
            x: state.browserX || undefined,
            y: state.browserY || undefined,
            width: state.browserWidth || 1280,
            height: state.browserHeight || 720,
            minWidth: 100,
            minHeight: 100,
            devTools: state.isBrowserDevToolsOpen || undefined,
            contextMenu: true,
            partition: this._getPartition(options),
            trackState: {
                width: 'browserWidth',
                height: 'browserHeight',
                x: 'browserX',
                y: 'browserY',
                devTools: 'isBrowserDevToolsOpen',
            },
            webPreferences: {
                sandbox: true,
            },
            show: !options.browser.isHeadless,
            // prevents a tiny 1px padding around the window
            // causing screenshots/videos to be off by 1px
            resizable: !options.browser.isHeadless,
            async onCrashed() {
                const err = errors.get('RENDERER_CRASHED', 'Electron');
                await memory_1.default.endProfiling();
                if (!options.onError) {
                    errors.log(err);
                    throw new Error('Missing onError in onCrashed');
                }
                options.onError(err);
            },
            onFocus() {
                if (!options.browser.isHeadless) {
                    return menu_1.default.set({ withInternalDevTools: true });
                }
            },
            async onNewWindow({ url }) {
                let _win = this;
                _win.on('closed', () => {
                    // in some cases, the browser/test will close before _launchChild completes, leaving a destroyed/stale window object.
                    // in these cases, we want to proceed to the next test/open window without critically failing
                    _win = null;
                });
                try {
                    const child = await _this._launchChild(url, _win, projectRoot, state, options, automation);
                    // close child on parent close
                    _win.on('close', () => {
                        if (!child.isDestroyed()) {
                            child.destroy();
                        }
                    });
                    // add this pid to list of pids
                    tryToCall(child, () => {
                        if (instance && instance.pid) {
                            if (!instance.allPids)
                                throw new Error('Missing allPids!');
                            instance.allPids.push(child.webContents.getOSProcessId());
                        }
                    });
                }
                catch (e) {
                    // sometimes the launch fails first before the closed event is emitted on the window object
                    // in this case, check to see if the load failed with error code -2 or if the object (window) was destroyeds
                    if (_win === null || e.message.includes('Object has been destroyed') || ((e === null || e === void 0 ? void 0 : e.errno) === -2 && (e === null || e === void 0 ? void 0 : e.code) === 'ERR_FAILED')) {
                        debug(`The window was closed while launching the child process. This usually means the browser or test errored before fully completing the launch process. Cypress will proceed to the next test`);
                    }
                    else {
                        throw e;
                    }
                }
            },
        };
        return lodash_1.default.defaultsDeep({}, options, defaults);
    },
    _getAutomation,
    async _render(url, automation, preferences, options, cdpSocketServer) {
        const win = Windows.create(options.projectRoot, preferences);
        if (preferences.browser.isHeadless) {
            // seemingly the only way to force headless to a certain screen size
            // electron BrowserWindow constructor is not respecting width/height preferences
            win.setSize(preferences.width, preferences.height);
        }
        else if (options.isTextTerminal) {
            // we maximize in headed mode as long as it's run mode
            // this is consistent with chrome+firefox headed
            win.maximize();
        }
        return await this._launch(win, url, automation, preferences, options.videoApi, options.protocolManager, cdpSocketServer);
    },
    _launchChild(url, parent, projectRoot, state, options, automation) {
        const [parentX, parentY] = parent.getPosition();
        const electronOptions = this._defaultOptions(projectRoot, state, options, automation);
        lodash_1.default.extend(electronOptions, {
            x: parentX + 100,
            y: parentY + 100,
            trackState: false,
            // in run mode, force new windows to automatically open with show: false
            // this prevents window.open inside of javascript client code to cause a new BrowserWindow instance to open
            // https://github.com/cypress-io/cypress/issues/123
            show: !options.isTextTerminal,
        });
        const win = Windows.create(projectRoot, electronOptions);
        return this._launch(win, url, automation, electronOptions);
    },
    async _launch(win, url, automation, options, videoApi, protocolManager, cdpSocketServer) {
        if (options.show) {
            menu_1.default.set({ withInternalDevTools: true });
        }
        ELECTRON_DEBUG_EVENTS.forEach((e) => {
            // @ts-expect-error mapping strings to event names is failing typecheck
            win.on(e, () => {
                debug('%s fired on the BrowserWindow %o', e, { browserWindowUrl: url });
            });
        });
        let cdpAutomation;
        // If the cdp socket server is not present, this is a child window and we don't want to bind or listen to anything
        if (cdpSocketServer) {
            await win.loadURL('about:blank');
            cdpAutomation = await this._getAutomation(win, options, automation);
            automation.use(cdpAutomation);
        }
        const ua = options.userAgent;
        if (ua) {
            this._setUserAgent(win.webContents, ua);
            // @see https://github.com/cypress-io/cypress/issues/22953
        }
        else if (options.experimentalModifyObstructiveThirdPartyCode) {
            const userAgent = this._getUserAgent(win.webContents);
            // replace any obstructive electron user agents that contain electron or cypress references to appear more chrome-like
            const modifiedNonObstructiveUserAgent = userAgent.replace(/Cypress.*?\s|[Ee]lectron.*?\s/g, '');
            this._setUserAgent(win.webContents, modifiedNonObstructiveUserAgent);
        }
        const setProxy = () => {
            let ps;
            ps = options.proxyServer;
            if (ps) {
                return this._setProxy(win.webContents, ps);
            }
        };
        await Promise.all([
            setProxy(),
            this._clearCache(win.webContents),
        ]);
        if (cdpAutomation) {
            const browserCriClient = this._getBrowserCriClient();
            const pageCriClient = browserCriClient === null || browserCriClient === void 0 ? void 0 : browserCriClient.currentlyAttachedTarget;
            if (!pageCriClient)
                throw new Error('Missing pageCriClient in _launch');
            await Promise.all([
                pageCriClient.send('Page.enable'),
                this.connectProtocolToBrowser({ protocolManager }),
                cdpSocketServer === null || cdpSocketServer === void 0 ? void 0 : cdpSocketServer.attachCDPClient(cdpAutomation),
                videoApi && recordVideo(cdpAutomation, videoApi),
                this._handleDownloads(win, options.downloadsFolder, automation),
                utils_1.default.handleDownloadLinksViaCDP(pageCriClient, automation),
                // Ensure to clear browser state in between runs. This is handled differently in browsers when we launch new tabs, but we don't have that concept in electron
                pageCriClient.send('Storage.clearDataForOrigin', { origin: '*', storageTypes: 'all' }),
                pageCriClient.send('Network.clearBrowserCache'),
            ]);
        }
        // enabling can only happen once the window has loaded
        await this._enableDebugger();
        // Note that these calls have to happen before we load the page so that we don't miss out on any events that happen quickly
        if (cdpAutomation) {
            // These calls need to happen prior to loading the URL so we can be sure to get the frames as they come in
            await cdpAutomation._handlePausedRequests(browserCriClient === null || browserCriClient === void 0 ? void 0 : browserCriClient.currentlyAttachedTarget);
            cdpAutomation._listenForFrameTreeChanges(browserCriClient === null || browserCriClient === void 0 ? void 0 : browserCriClient.currentlyAttachedTarget);
        }
        await win.loadURL(url);
        return win;
    },
    _enableDebugger() {
        var _a;
        debug('debugger: enable Console and Network');
        const browserCriClient = this._getBrowserCriClient();
        return (_a = browserCriClient === null || browserCriClient === void 0 ? void 0 : browserCriClient.currentlyAttachedTarget) === null || _a === void 0 ? void 0 : _a.send('Console.enable');
    },
    _handleDownloads(win, dir, automation) {
        var _a;
        const onWillDownload = (_event, downloadItem) => {
            const savePath = path_1.default.join(dir, downloadItem.getFilename());
            automation.push('create:download', {
                id: downloadItem.getETag(),
                filePath: savePath,
                mime: downloadItem.getMimeType(),
                url: downloadItem.getURL(),
            });
            downloadItem.once('done', (_event, state) => {
                if (state === 'completed') {
                    return automation.push('complete:download', {
                        id: downloadItem.getETag(),
                    });
                }
                automation.push('canceled:download', {
                    id: downloadItem.getETag(),
                });
            });
        };
        const { session } = win.webContents;
        session.on('will-download', onWillDownload);
        // avoid adding redundant `will-download` handlers if session is reused for next spec
        win.on('closed', () => session.removeListener('will-download', onWillDownload));
        const browserCriClient = this._getBrowserCriClient();
        return (_a = browserCriClient === null || browserCriClient === void 0 ? void 0 : browserCriClient.currentlyAttachedTarget) === null || _a === void 0 ? void 0 : _a.send('Page.setDownloadBehavior', {
            behavior: 'allow',
            downloadPath: dir,
        });
    },
    _getPartition(options) {
        if (options.isTextTerminal) {
            // create dynamic persisted run
            // to enable parallelization
            return `persist:run-${process.pid}`;
        }
        // we're in interactive mode and always
        // use the same session
        return 'persist:interactive';
    },
    _clearCache(webContents) {
        debug('clearing cache');
        return webContents.session.clearCache();
    },
    _getUserAgent(webContents) {
        const userAgent = webContents.session.getUserAgent();
        debug('found user agent: %s', userAgent);
        return userAgent;
    },
    _setUserAgent(webContents, userAgent) {
        var _a;
        debug('setting user agent to:', userAgent);
        // set both because why not
        webContents.userAgent = userAgent;
        const browserCriClient = this._getBrowserCriClient();
        // In addition to the session, also set the user-agent optimistically through CDP. @see https://github.com/cypress-io/cypress/issues/23597
        (_a = browserCriClient === null || browserCriClient === void 0 ? void 0 : browserCriClient.currentlyAttachedTarget) === null || _a === void 0 ? void 0 : _a.send('Network.setUserAgentOverride', {
            userAgent,
        });
        return webContents.session.setUserAgent(userAgent);
    },
    _setProxy(webContents, proxyServer) {
        return webContents.session.setProxy({
            proxyRules: proxyServer,
            // this should really only be necessary when
            // running Chromium versions >= 72
            // https://github.com/cypress-io/cypress/issues/1872
            proxyBypassRules: '<-loopback>',
        });
    },
    _getBrowserCriClient() {
        return browserCriClient;
    },
    /**
     * Clear instance state for the electron instance, this is normally called on kill or on exit, for electron there isn't any state to clear.
     */
    clearInstanceState(options = {}) {
        debug('closing remote interface client', { options });
        // Do nothing on failure here since we're shutting down anyway
        browserCriClient === null || browserCriClient === void 0 ? void 0 : browserCriClient.close(options.gracefulShutdown).catch(() => { });
        browserCriClient = null;
    },
    connectToNewSpec(browser, options, automation) {
        throw new Error('Attempting to connect to a new spec is not supported for electron, use open instead');
    },
    connectToExisting() {
        throw new Error('Attempting to connect to existing browser for Cypress in Cypress which is not yet implemented for electron');
    },
    async connectProtocolToBrowser(options) {
        var _a;
        const browserCriClient = this._getBrowserCriClient();
        if (!(browserCriClient === null || browserCriClient === void 0 ? void 0 : browserCriClient.currentlyAttachedTarget))
            throw new Error('Missing pageCriClient in connectProtocolToBrowser');
        await ((_a = options.protocolManager) === null || _a === void 0 ? void 0 : _a.connectToBrowser(browserCriClient.currentlyAttachedTarget));
    },
    validateLaunchOptions(launchOptions) {
        const options = [];
        if (Object.keys(launchOptions.env).length > 0)
            options.push('env');
        if (launchOptions.args.length > 0)
            options.push('args');
        if (options.length > 0) {
            errors.warning('BROWSER_UNSUPPORTED_LAUNCH_OPTION', 'electron', options);
        }
    },
    async open(browser, url, options, automation, cdpSocketServer) {
        debug('open %o', { browser, url });
        const State = await savedState.create(options.projectRoot, options.isTextTerminal);
        const state = await State.get();
        debug('received saved state %o', state);
        // get our electron default options
        const electronOptions = Windows.defaults(this._defaultOptions(options.projectRoot, state, options, automation));
        debug('browser window options %o', lodash_1.default.omitBy(electronOptions, lodash_1.default.isFunction));
        const defaultLaunchOptions = utils_1.default.getDefaultLaunchOptions({
            preferences: electronOptions,
        });
        const launchOptions = await utils_1.default.executeBeforeBrowserLaunch(browser, defaultLaunchOptions, electronOptions);
        this.validateLaunchOptions(launchOptions);
        const { preferences } = launchOptions;
        debug('launching browser window to url: %s', url);
        const win = await this._render(url, automation, preferences, electronOptions, cdpSocketServer);
        await _installExtensions(win, launchOptions.extensions, electronOptions);
        // cause the webview to receive focus so that
        // native browser focus + blur events fire correctly
        // https://github.com/cypress-io/cypress/issues/1939
        tryToCall(win, 'focusOnWebView');
        const events = new events_1.default();
        win.once('closed', () => {
            debug('closed event fired');
            Windows.removeAllExtensions(win);
            return events.emit('exit');
        });
        const mainPid = tryToCall(win, () => {
            return win.webContents.getOSProcessId();
        });
        const clearInstanceState = this.clearInstanceState;
        instance = lodash_1.default.extend(events, {
            pid: mainPid,
            allPids: [mainPid],
            browserWindow: win,
            kill() {
                clearInstanceState({ gracefulShutdown: true });
                if (this.isProcessExit) {
                    // if the process is exiting, all BrowserWindows will be destroyed anyways
                    return;
                }
                return tryToCall(win, 'destroy');
            },
            removeAllListeners() {
                return tryToCall(win, 'removeAllListeners');
            },
        });
        await utils_1.default.executeAfterBrowserLaunch(browser, {
            webSocketDebuggerUrl: browserCriClient.getWebSocketDebuggerUrl(),
        });
        return instance;
    },
    async closeExtraTargets() {
        return browserCriClient === null || browserCriClient === void 0 ? void 0 : browserCriClient.closeExtraTargets();
    },
};
