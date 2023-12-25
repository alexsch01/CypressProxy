"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BrowserCriClient = void 0;
const tslib_1 = require("tslib");
const bluebird_1 = tslib_1.__importDefault(require("bluebird"));
const chrome_remote_interface_1 = tslib_1.__importDefault(require("chrome-remote-interface"));
const debug_1 = tslib_1.__importDefault(require("debug"));
const protocol_1 = require("./protocol");
const errors = tslib_1.__importStar(require("../errors"));
const cri_client_1 = require("./cri-client");
const debug = (0, debug_1.default)('cypress:server:browsers:browser-cri-client');
const isVersionGte = (a, b) => {
    return a.major > b.major || (a.major === b.major && a.minor >= b.minor);
};
const getMajorMinorVersion = (version) => {
    const [major, minor] = version.split('.', 2).map(Number);
    return { major, minor };
};
const ensureLiveBrowser = async (hosts, port, browserName) => {
    // since we may be attempting to connect to multiple hosts, 'connected'
    // is set to true once one of the connections succeeds so the others
    // can be cancelled
    let connected = false;
    const tryBrowserConnection = async (host, port, browserName) => {
        const connectOpts = {
            host,
            port,
            getDelayMsForRetry: (i) => {
                // if we successfully connected to a different host, cancel any remaining connection attempts
                if (connected) {
                    debug('cancelling any additional retries %o', { host, port });
                    return;
                }
                return (0, protocol_1._getDelayMsForRetry)(i, browserName);
            },
        };
        await (0, protocol_1._connectAsync)(connectOpts);
        connected = true;
        return host;
    };
    const connections = hosts.map((host) => {
        return tryBrowserConnection(host, port, browserName)
            .catch((err) => {
            // don't throw an error if we've already connected
            if (!connected) {
                const e = errors.get('CDP_COULD_NOT_CONNECT', browserName, port, err);
                e.cause = {
                    err,
                    host,
                    port,
                };
                throw e;
            }
            return '';
        });
    });
    // go through all of the hosts and attempt to make a connection
    return Promise.any(connections)
        // this only fires if ALL of the connections fail
        // otherwise if 1 succeeds and 1+ fails it won't log anything
        .catch((aggErr) => {
        aggErr.errors.forEach((e) => {
            const { host, port, err } = e.cause;
            debug('failed to connect to CDP %o', { host, port, err });
        });
        // throw the first error we received from the aggregate
        throw aggErr.errors[0];
    });
};
const retryWithIncreasingDelay = async (retryable, browserName, port) => {
    let retryIndex = 0;
    const retry = async () => {
        try {
            return await retryable();
        }
        catch (err) {
            retryIndex++;
            const delay = (0, protocol_1._getDelayMsForRetry)(retryIndex, browserName);
            debug('error finding browser target, maybe retrying %o', { delay, err });
            if (typeof delay === 'undefined') {
                debug('failed to connect to CDP %o', { err });
                errors.throwErr('CDP_COULD_NOT_CONNECT', browserName, port, err);
            }
            await new Promise((resolve) => setTimeout(resolve, delay));
            return retry();
        }
    };
    return retry();
};
class BrowserCriClient {
    constructor({ browserClient, versionInfo, host, port, browserName, onAsynchronousError, protocolManager, fullyManageTabs }) {
        // whenever we instantiate the instance we're already connected bc
        // we receive an underlying CRI connection
        // TODO: remove "connected" in favor of closing/closed or disconnected
        this.connected = true;
        this.closing = false;
        this.closed = false;
        this.resettingBrowserTargets = false;
        this.extraTargetClients = new Map();
        this.onClose = null;
        /**
         * Ensures that the minimum protocol version for the browser is met
         *
         * @param protocolVersion the minimum version to ensure
         */
        this.ensureMinimumProtocolVersion = (protocolVersion) => {
            const actualVersion = getMajorMinorVersion(this.versionInfo['Protocol-Version']);
            const minimum = getMajorMinorVersion(protocolVersion);
            if (!isVersionGte(actualVersion, minimum)) {
                errors.throwErr('CDP_VERSION_TOO_OLD', protocolVersion, actualVersion);
            }
        };
        /**
         * Attaches to a target with the given url
         *
         * @param url the url to attach to
         * @returns the chrome remote interface wrapper for the target
         */
        this.attachToTargetUrl = async (url) => {
            // Continue trying to re-attach until successful.
            // If the browser opens slowly, this will fail until
            // The browser and automation API is ready, so we try a few
            // times until eventually timing out.
            return retryWithIncreasingDelay(async () => {
                var _a;
                debug('Attaching to target url %s', url);
                const { targetInfos: targets } = await this.browserClient.send('Target.getTargets');
                const target = targets.find((target) => target.url === url);
                if (!target) {
                    throw new Error(`Could not find url target in browser ${url}. Targets were ${JSON.stringify(targets)}`);
                }
                this.currentlyAttachedTarget = await (0, cri_client_1.create)({ target: target.targetId, onAsynchronousError: this.onAsynchronousError, host: this.host, port: this.port, protocolManager: this.protocolManager, fullyManageTabs: this.fullyManageTabs, browserClient: this.browserClient });
                await ((_a = this.protocolManager) === null || _a === void 0 ? void 0 : _a.connectToBrowser(this.currentlyAttachedTarget));
                return this.currentlyAttachedTarget;
            }, this.browserName, this.port);
        };
        /**
         * Resets the browser's targets optionally keeping a tab open
         *
         * @param shouldKeepTabOpen whether or not to keep the tab open
         */
        this.resetBrowserTargets = async (shouldKeepTabOpen) => {
            if (this.closed) {
                debug('browser cri client is closed, not resetting browser targets');
                return;
            }
            this.resettingBrowserTargets = true;
            if (!this.currentlyAttachedTarget) {
                throw new Error('Cannot close target because no target is currently attached');
            }
            let target;
            // If we are keeping a tab open, we need to first launch a new default tab prior to closing the existing one
            if (shouldKeepTabOpen) {
                target = await this.browserClient.send('Target.createTarget', { url: 'about:blank' });
            }
            debug('currently attached targets', this.currentlyAttachedTarget.targetId, this.currentlyAttachedTarget.closed);
            if (!this.currentlyAttachedTarget.closed) {
                debug('closing current target %s', this.currentlyAttachedTarget.targetId);
                await this.browserClient.send('Target.closeTarget', { targetId: this.currentlyAttachedTarget.targetId });
                debug('target closed', this.currentlyAttachedTarget.targetId);
                await this.currentlyAttachedTarget.close().catch(() => { });
                debug('target client closed', this.currentlyAttachedTarget.targetId);
            }
            if (target) {
                this.currentlyAttachedTarget = await (0, cri_client_1.create)({
                    target: target.targetId,
                    onAsynchronousError: this.onAsynchronousError,
                    host: this.host,
                    port: this.port,
                    protocolManager: this.protocolManager,
                    fullyManageTabs: this.fullyManageTabs,
                });
            }
            else {
                this.currentlyAttachedTarget = undefined;
            }
            this.resettingBrowserTargets = false;
        };
        /**
         * Closes the browser client socket as well as the socket for the currently attached page target
         */
        this.close = async (gracefulShutdown) => {
            this.gracefulShutdown = gracefulShutdown;
            this.onClose && this.onClose(gracefulShutdown);
            if (this.connected === false) {
                debug('browser cri client is already closed');
                return;
            }
            this.closing = true;
            this.connected = false;
            if (this.currentlyAttachedTarget) {
                await this.currentlyAttachedTarget.close();
            }
            await this.browserClient.close();
            this.closed = true;
        };
        this.browserClient = browserClient;
        this.versionInfo = versionInfo;
        this.host = host;
        this.port = port;
        this.browserName = browserName;
        this.onAsynchronousError = onAsynchronousError;
        this.protocolManager = protocolManager;
        this.fullyManageTabs = fullyManageTabs;
    }
    /**
     * Factory method for the browser cri client. Connects to the browser and then returns a chrome remote interface wrapper around the
     * browser target
     *
     * @param browserName the display name of the browser being launched
     * @param fullyManageTabs whether or not to fully manage tabs. This is useful for firefox where some work is done with marionette and some with CDP. We don't want to handle disconnections in this class in those scenarios
     * @param hosts the hosts to which to attempt to connect
     * @param onAsynchronousError callback for any cdp fatal errors
     * @param onReconnect callback for when the browser cri client reconnects to the browser
     * @param port the port to which to connect
     * @param protocolManager the protocol manager to use with the browser cri client
     * @returns a wrapper around the chrome remote interface that is connected to the browser target
     */
    static async create(options) {
        const { browserName, fullyManageTabs, hosts, onAsynchronousError, onReconnect, port, protocolManager, } = options;
        const host = await ensureLiveBrowser(hosts, port, browserName);
        return retryWithIncreasingDelay(async () => {
            const versionInfo = await chrome_remote_interface_1.default.Version({ host, port, useHostName: true });
            const browserClient = await (0, cri_client_1.create)({
                target: versionInfo.webSocketDebuggerUrl,
                onAsynchronousError,
                onReconnect,
                protocolManager,
                fullyManageTabs,
            });
            const browserCriClient = new BrowserCriClient({ browserClient, versionInfo, host, port, browserName, onAsynchronousError, protocolManager, fullyManageTabs });
            if (fullyManageTabs) {
                await this._manageTabs({ browserClient, browserCriClient, browserName, host, onAsynchronousError, port, protocolManager });
            }
            return browserCriClient;
        }, browserName, port);
    }
    static async _manageTabs({ browserClient, browserCriClient, browserName, host, onAsynchronousError, port, protocolManager }) {
        const promises = [
            browserClient.send('Target.setDiscoverTargets', { discover: true }),
            browserClient.send('Target.setAutoAttach', { autoAttach: true, waitForDebuggerOnStart: true, flatten: true }),
        ];
        browserClient.on('Target.attachedToTarget', async (event) => {
            await this._onAttachToTarget({ browserClient, browserCriClient, event, host, port, protocolManager });
        });
        browserClient.on('Target.targetDestroyed', (event) => {
            this._onTargetDestroyed({ browserClient, browserCriClient, browserName, event, onAsynchronousError });
        });
        browserClient.on('Inspector.targetReloadedAfterCrash', async (event, sessionId) => {
            try {
                // Things like service workers will effectively crash in terms of CDP when the page is reloaded in the middle of things
                // We will still auto attach in this case, but we need to runIfWaitingForDebugger to get the page back to a running state
                await browserClient.send('Runtime.runIfWaitingForDebugger', undefined, sessionId);
            }
            catch (error) {
                // it's possible that the target was closed before we can run. If so, just ignore
                debug('error running Runtime.runIfWaitingForDebugger:', error);
            }
        });
        await Promise.all(promises);
    }
    static async _onAttachToTarget(options) {
        var _a, _b;
        const { browserClient, browserCriClient, CriConstructor, event, host, port, protocolManager } = options;
        const CreateCRI = CriConstructor || chrome_remote_interface_1.default;
        const { sessionId, targetInfo, waitingForDebugger } = event;
        let { targetId, url } = targetInfo;
        debug('Target.attachedToTarget %o', targetInfo);
        try {
            // The basic approach here is we attach to targets and enable network traffic
            // We must attach in a paused state so that we can enable network traffic before the target starts running.
            // We don't track child tabs/page network traffic. 'other' targets can't have network enabled
            if (event.targetInfo.type !== 'page' && event.targetInfo.type !== 'other') {
                await browserClient.send('Network.enable', (_a = protocolManager === null || protocolManager === void 0 ? void 0 : protocolManager.networkEnableOptions) !== null && _a !== void 0 ? _a : cri_client_1.DEFAULT_NETWORK_ENABLE_OPTIONS, event.sessionId);
            }
        }
        catch (error) {
            // it's possible that the target was closed before we could enable
            // network and continue, in that case, just ignore
            debug('error running Network.enable:', error);
        }
        if (!waitingForDebugger) {
            debug('Not waiting for debugger (id: %s)', targetId);
            // a target created before we started listening won't be waiting
            // for the debugger and is therefore not an extra target
            return;
        }
        async function run() {
            try {
                await browserClient.send('Runtime.runIfWaitingForDebugger', undefined, sessionId);
            }
            catch (error) {
                // it's possible that the target was closed before we could enable
                // network and continue, in that case, just ignore
                debug('error running Runtime.runIfWaitingForDebugger:', error);
            }
        }
        // the url often isn't specified with this event, so we get it
        // from Target.getTargets
        if (!url) {
            const { targetInfos } = await browserClient.send('Target.getTargets');
            const thisTarget = targetInfos.find((target) => target.targetId === targetId);
            if (thisTarget) {
                url = thisTarget.url;
            }
        }
        if (
        // if resetting browser targets, the first target attached to is the
        // main Cypress tab, but hasn't been set as
        // browserCriClient.currentlyAttachedTarget yet
        browserCriClient.resettingBrowserTargets
            // is the main Cypress tab
            || targetId === ((_b = browserCriClient.currentlyAttachedTarget) === null || _b === void 0 ? void 0 : _b.targetId)
            // is not a tab/window, such as a service worker
            || targetInfo.type !== 'page'
            // is DevTools
            || url.includes('devtools://')
            // is the Launchpad
            || url.includes('__launchpad')
            // is chrome extension service worker
            || url.includes('chrome-extension://')) {
            debug('Not an extra target (id: %s)', targetId);
            // in these cases, we don't want to track the targets as extras.
            // we're only interested in extra tabs or windows
            return await run();
        }
        debug('Connect as extra target (id: %s)', targetId);
        let extraTargetCriClient;
        try {
            extraTargetCriClient = await CreateCRI({
                host,
                port,
                target: targetId,
                local: true,
                useHostName: true,
            });
        }
        catch (err) {
            debug('Errored connecting to target (id: %s): %s', targetId, (err === null || err === void 0 ? void 0 : err.stack) || err);
            return await run();
        }
        browserCriClient.addExtraTargetClient(targetInfo, extraTargetCriClient);
        await extraTargetCriClient.send('Fetch.enable');
        // we mark extra targets with this header, so that the proxy can recognize
        // where they came from and run only the minimal middleware necessary
        extraTargetCriClient.on('Fetch.requestPaused', async (params) => {
            const details = {
                requestId: params.requestId,
                headers: [{ name: 'X-Cypress-Is-From-Extra-Target', value: 'true' }],
            };
            extraTargetCriClient.send('Fetch.continueRequest', details).catch((err) => {
                // swallow this error so it doesn't crash Cypress
                debug('continueRequest failed, url: %s, error: %s', params.request.url, (err === null || err === void 0 ? void 0 : err.stack) || err);
            });
        });
        await run();
    }
    static _onTargetDestroyed({ browserClient, browserCriClient, browserName, event, onAsynchronousError }) {
        var _a;
        debug('Target.targetDestroyed %o', {
            event,
            closing: browserCriClient.closing,
            closed: browserCriClient.closed,
            resettingBrowserTargets: browserCriClient.resettingBrowserTargets,
        });
        const { targetId } = event;
        if (targetId !== ((_a = browserCriClient.currentlyAttachedTarget) === null || _a === void 0 ? void 0 : _a.targetId)) {
            if (browserCriClient.hasExtraTargetClient(targetId)) {
                debug('Close extra target client (id: %s)');
                browserCriClient.getExtraTargetClient(targetId).client.close().catch(() => { });
                browserCriClient.removeExtraTargetClient(targetId);
            }
            // we may have gotten a delayed "Target.targetDestroyed" event for a page that we
            // have already closed/disposed, so unless this matches our current target then bail
            return;
        }
        // otherwise...
        // the page or browser closed in an unexpected manner and we need to bubble up this error
        // by calling onError() with either browser or page was closed
        //
        // we detect this by waiting up to 500ms for either the browser's websocket connection to be closed
        // OR from process.exit(...) firing
        // if the browser's websocket connection has been closed then that means the page was closed
        //
        // otherwise it means the the browser itself was closed
        // always close the connection to the page target because it was destroyed
        browserCriClient.currentlyAttachedTarget.close().catch(() => { }),
            new bluebird_1.default((resolve) => {
                // this event could fire either expectedly or unexpectedly
                // it's not a problem if we're expected to be closing the browser naturally
                // and not as a result of an unexpected page or browser closure
                if (browserCriClient.resettingBrowserTargets) {
                    // do nothing, we're good
                    return resolve(true);
                }
                if (typeof browserCriClient.gracefulShutdown !== 'undefined') {
                    return resolve(browserCriClient.gracefulShutdown);
                }
                // when process.on('exit') is called, we call onClose
                browserCriClient.onClose = resolve;
                // or when the browser's CDP ws connection is closed
                browserClient.ws.once('close', () => {
                    resolve(false);
                });
            })
                .timeout(500)
                .then((expectedDestroyedEvent) => {
                if (expectedDestroyedEvent === true) {
                    return;
                }
                // browserClient websocket was disconnected
                // or we've been closed due to process.on('exit')
                // meaning the browser was closed and not just the page
                errors.throwErr('BROWSER_PROCESS_CLOSED_UNEXPECTEDLY', browserName);
            })
                .catch(bluebird_1.default.TimeoutError, () => {
                debug('browser websocket did not close, page was closed %o', { targetId });
                // the browser websocket didn't close meaning
                // only the page was closed, not the browser
                errors.throwErr('BROWSER_PAGE_CLOSED_UNEXPECTEDLY', browserName);
            })
                .catch((err) => {
                // stop the run instead of moving to the next spec
                err.isFatalApiErr = true;
                onAsynchronousError(err);
            });
    }
    addExtraTargetClient(targetInfo, client) {
        this.extraTargetClients.set(targetInfo.targetId, { client, targetInfo });
    }
    hasExtraTargetClient(targetId) {
        return this.extraTargetClients.has(targetId);
    }
    getExtraTargetClient(targetId) {
        return this.extraTargetClients.get(targetId);
    }
    removeExtraTargetClient(targetId) {
        this.extraTargetClients.delete(targetId);
    }
    async closeExtraTargets() {
        await Promise.all(Array.from(this.extraTargetClients).map(async ([targetId]) => {
            debug('Close extra target (id: %s)', targetId);
            try {
                await this.browserClient.send('Target.closeTarget', { targetId });
            }
            catch (err) {
                debug('Closing extra target errored: %s', (err === null || err === void 0 ? void 0 : err.stack) || err);
            }
        }));
    }
    /**
     * @returns the websocket debugger URL for the currently connected browser
     */
    getWebSocketDebuggerUrl() {
        return this.versionInfo.webSocketDebuggerUrl;
    }
}
exports.BrowserCriClient = BrowserCriClient;
