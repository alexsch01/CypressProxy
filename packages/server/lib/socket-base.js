"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SocketBase = void 0;
const tslib_1 = require("tslib");
const bluebird_1 = tslib_1.__importDefault(require("bluebird"));
const debug_1 = tslib_1.__importDefault(require("debug"));
const events_1 = tslib_1.__importDefault(require("events"));
const lodash_1 = tslib_1.__importDefault(require("lodash"));
const data_context_1 = require(process.argv[1]+"/../packages/data-context");
const makeGraphQLServer_1 = require(process.argv[1]+"/../packages/graphql/src/makeGraphQLServer");
const net_stubbing_1 = require(process.argv[1]+"/../packages/net-stubbing");
const socketIo = tslib_1.__importStar(require(process.argv[1]+"/../packages/socket"));
const cdp_socket_1 = require(process.argv[1]+"/../packages/socket/lib/cdp-socket");
const errors = tslib_1.__importStar(require("./errors"));
const fixture_1 = tslib_1.__importDefault(require("./fixture"));
const class_helpers_1 = require("./util/class-helpers");
const editors_1 = require("./util/editors");
const file_opener_1 = require("./util/file-opener");
const open_1 = tslib_1.__importDefault(require("./util/open"));
const session = tslib_1.__importStar(require("./session"));
const cookies_1 = require("./util/cookies");
const run_events_1 = tslib_1.__importDefault(require("./plugins/run_events"));
const telemetry_1 = require(process.argv[1]+"/../packages/telemetry");
const network_1 = require(process.argv[1]+"/../packages/network");
const privileged_commands_manager_1 = require("./privileged-commands/privileged-commands-manager");
const debug = (0, debug_1.default)('cypress:server:socket-base');
const retry = (fn) => {
    return bluebird_1.default.delay(25).then(fn);
};
class SocketBase {
    constructor(config) {
        this.ensureProp = class_helpers_1.ensureProp;
        this.inRunMode = config.isTextTerminal;
        this.supportsRunEvents = config.isTextTerminal || config.experimentalInteractiveRunEvents;
        this.ended = false;
        this.localBus = new events_1.default();
    }
    get socketIo() {
        return this.ensureProp(this._socketIo, 'startListening');
    }
    get cdpIo() {
        return this._cdpIo;
    }
    getIos() {
        return [this._cdpIo, this._socketIo];
    }
    toRunner(event, data) {
        this.getIos().forEach((io) => {
            io === null || io === void 0 ? void 0 : io.to('runner').emit(event, data);
        });
    }
    isSocketConnected(socket) {
        return socket && socket.connected;
    }
    toDriver(event, ...data) {
        this.getIos().forEach((io) => {
            io === null || io === void 0 ? void 0 : io.emit(event, ...data);
        });
    }
    onAutomation(socket, message, data, id) {
        // instead of throwing immediately here perhaps we need
        // to make this more resilient by automatically retrying
        // up to 1 second in the case where our automation room
        // is empty. that would give padding for reconnections
        // to automatically happen.
        // for instance when socket.io detects a disconnect
        // does it immediately remove the member from the room?
        // YES it does per http://socket.io/docs/rooms-and-namespaces/#disconnection
        if (this.isSocketConnected(socket)) {
            return socket.emit('automation:request', id, message, data);
        }
        throw new Error(`Could not process '${message}'. No automation clients connected.`);
    }
    createCDPIo(socketIoRoute) {
        return new cdp_socket_1.CDPSocketServer({ path: socketIoRoute });
    }
    createSocketIo(server, path, cookie) {
        return new socketIo.SocketIOServer(server, {
            path,
            cookie: {
                name: cookie,
            },
            destroyUpgrade: false,
            serveClient: false,
            // TODO(webkit): the websocket socket.io transport is busted in WebKit, need polling
            transports: ['websocket', 'polling'],
        });
    }
    startListening(server, automation, config, options, callbacks) {
        let runState = undefined;
        lodash_1.default.defaults(options, {
            socketId: null,
            onResetServerState() { },
            onTestsReceivedAndMaybeRecord() { },
            onMocha() { },
            onConnect() { },
            onRequest() { },
            onResolveUrl() { },
            onFocusTests() { },
            onSpecChanged() { },
            onChromiumRun() { },
            onReloadBrowser() { },
            closeExtraTargets() { },
            onSavedStateChanged() { },
            onTestFileChange() { },
            onCaptureVideoFrames() { },
        });
        let automationClient;
        let runnerSocket;
        const { socketIoRoute, socketIoCookie } = config;
        const socketIo = this._socketIo = this.createSocketIo(server, socketIoRoute, socketIoCookie);
        const cdpIo = this._cdpIo = this.createCDPIo(socketIoRoute);
        automation.use({
            onPush: (message, data) => {
                socketIo.emit('automation:push:message', message, data);
                cdpIo.emit('automation:push:message', message, data);
            },
        });
        const resetRenderedHTMLOrigins = () => {
            const origins = options.getRenderedHTMLOrigins();
            Object.keys(origins).forEach((key) => delete origins[key]);
        };
        const onAutomationClientRequestCallback = (message, data, id) => {
            return this.onAutomation(automationClient, message, data, id);
        };
        const automationRequest = (message, data) => {
            return automation.request(message, data, onAutomationClientRequestCallback);
        };
        const getFixture = (path, opts) => fixture_1.default.get(config.fixturesFolder, path, opts);
        this.getIos().forEach((io) => {
            io === null || io === void 0 ? void 0 : io.on('connection', (socket) => {
                var _a;
                if (socket.conn && socket.conn.transport.name === 'polling' && ((_a = options.getCurrentBrowser()) === null || _a === void 0 ? void 0 : _a.family) !== 'webkit') {
                    debug('polling WebSocket request received with non-WebKit browser, disconnecting');
                    // TODO(webkit): polling transport is only used for experimental WebKit, and it bypasses SocketAllowed,
                    // we d/c polling clients if we're not in WK. remove once WK ws proxying is fixed
                    return socket.disconnect(true);
                }
                debug('socket connected');
                socket.on('disconnecting', (reason) => {
                    debug(`socket-disconnecting ${reason}`);
                });
                socket.on('disconnect', (reason) => {
                    debug(`socket-disconnect ${reason}`);
                });
                socket.on('error', (err) => {
                    debug(`socket-error ${err.message}`);
                });
                socket.on('automation:client:connected', () => {
                    const connectedBrowser = (0, data_context_1.getCtx)().coreData.activeBrowser;
                    if (automationClient === socket) {
                        return;
                    }
                    automationClient = socket;
                    debug('automation:client connected');
                    // only send the necessary config
                    automationClient.emit('automation:config', {});
                    // if our automation disconnects then we're
                    // in trouble and should probably bomb everything
                    automationClient.on('disconnect', () => {
                        const { activeBrowser } = (0, data_context_1.getCtx)().coreData;
                        // if we've stopped or if we've switched to another browser then don't do anything
                        if (this.ended || ((connectedBrowser === null || connectedBrowser === void 0 ? void 0 : connectedBrowser.path) !== (activeBrowser === null || activeBrowser === void 0 ? void 0 : activeBrowser.path))) {
                            return;
                        }
                        // if we are in headless mode then log out an error and maybe exit with process.exit(1)?
                        return bluebird_1.default.delay(2000)
                            .then(() => {
                            // bail if we've swapped to a new automationClient
                            if (automationClient !== socket) {
                                return;
                            }
                            // give ourselves about 2000ms to reconnect
                            // and if we're connected its all good
                            if (automationClient.connected) {
                                return;
                            }
                            // TODO: if all of our clients have also disconnected
                            // then don't warn anything
                            errors.warning('AUTOMATION_SERVER_DISCONNECTED');
                            // TODO: no longer emit this, just close the browser and display message in reporter
                            io === null || io === void 0 ? void 0 : io.emit('automation:disconnected');
                        });
                    });
                    socket.on('automation:push:request', (message, data, cb) => {
                        automation.push(message, data);
                        // just immediately callback because there
                        // is not really an 'ack' here
                        if (cb) {
                            return cb();
                        }
                    });
                    socket.on('automation:response', automation.response);
                });
                socket.on('automation:request', (message, data, cb) => {
                    debug('automation:request %s %o', message, data);
                    return automationRequest(message, data)
                        .then((resp) => {
                        return cb({ response: resp });
                    }).catch((err) => {
                        return cb({ error: errors.cloneErr(err) });
                    });
                });
                this._sendResetBrowserTabsForNextTestMessage = async (shouldKeepTabOpen) => {
                    await automationRequest('reset:browser:tabs:for:next:test', { shouldKeepTabOpen });
                };
                this._sendResetBrowserStateMessage = async () => {
                    await automationRequest('reset:browser:state', {});
                };
                this._sendFocusBrowserMessage = async () => {
                    await automationRequest('focus:browser:window', {});
                };
                this._isRunnerSocketConnected = () => {
                    return !!(runnerSocket && runnerSocket.connected);
                };
                socket.on('reporter:connected', () => {
                    if (socket.inReporterRoom) {
                        return;
                    }
                    socket.inReporterRoom = true;
                    return socket.join('reporter');
                });
                // TODO: what to do about reporter disconnections?
                socket.on('runner:connected', () => {
                    if (socket.inRunnerRoom) {
                        return;
                    }
                    runnerSocket = socket;
                    socket.inRunnerRoom = true;
                    return socket.join('runner');
                });
                // TODO: what to do about runner disconnections?
                socket.on('spec:changed', (spec) => {
                    return options.onSpecChanged(spec);
                });
                socket.on('app:connect', (socketId) => {
                    return options.onConnect(socketId, socket);
                });
                socket.on('set:runnables:and:maybe:record:tests', async (runnables, cb) => {
                    return options.onTestsReceivedAndMaybeRecord(runnables, cb);
                });
                socket.on('mocha', (...args) => {
                    return options.onMocha.apply(options, args);
                });
                socket.on('open:finder', (p, cb = function () { }) => {
                    return open_1.default.opn(p)
                        .then(() => {
                        return cb();
                    });
                });
                socket.on('recorder:frame', (data) => {
                    return options.onCaptureVideoFrames(data);
                });
                socket.on('reload:browser', (url, browser) => {
                    return options.onReloadBrowser(url, browser);
                });
                socket.on('focus:tests', () => {
                    return options.onFocusTests();
                });
                socket.on('is:automation:client:connected', (data, cb) => {
                    const isConnected = () => {
                        return automationRequest('is:automation:client:connected', data);
                    };
                    const tryConnected = () => {
                        return bluebird_1.default
                            .try(isConnected)
                            .catch(() => {
                            return retry(tryConnected);
                        });
                    };
                    // retry for up to data.timeout or 1 second
                    return bluebird_1.default
                        .try(tryConnected)
                        .timeout(data.timeout != null ? data.timeout : 1000)
                        .then(() => {
                        return cb(true);
                    }).catch(bluebird_1.default.TimeoutError, (_err) => {
                        return cb(false);
                    });
                });
                const setCrossOriginCookie = ({ cookie, url, sameSiteContext }) => {
                    const domain = network_1.cors.getOrigin(url);
                    cookies_1.cookieJar.setCookie((0, cookies_1.automationCookieToToughCookie)(cookie, domain), url, sameSiteContext);
                };
                socket.on('backend:request', (eventName, ...args) => {
                    var _a;
                    const userAgent = ((_a = socket.request) === null || _a === void 0 ? void 0 : _a.headers['user-agent']) || (0, data_context_1.getCtx)().coreData.app.browserUserAgent;
                    // cb is always the last argument
                    const cb = args.pop();
                    debug('backend:request %o', { eventName, args });
                    const backendRequest = () => {
                        var _a, _b, _c, _d, _e, _f, _g, _h, _j;
                        switch (eventName) {
                            case 'preserve:run:state':
                                runState = args[0];
                                return null;
                            case 'resolve:url': {
                                const [url, resolveOpts] = args;
                                return options.onResolveUrl(url, userAgent, automationRequest, resolveOpts);
                            }
                            case 'http:request':
                                return options.onRequest(userAgent, automationRequest, args[0]);
                            case 'reset:server:state':
                                return options.onResetServerState();
                            case 'log:memory:pressure':
                                return
                            case 'firefox:force:gc':
                                return
                            case 'get:fixture':
                                return getFixture(args[0], args[1]);
                            case 'net':
                                return (0, net_stubbing_1.onNetStubbingEvent)({
                                    eventName: args[0],
                                    frame: args[1],
                                    state: options.netStubbingState,
                                    socket: this,
                                    getFixture,
                                    args,
                                });
                            case 'save:session':
                                return session.saveSession(args[0]);
                            case 'clear:sessions':
                                return session.clearSessions(args[0]);
                            case 'get:session':
                                return session.getSession(args[0]);
                            case 'reset:cached:test:state':
                                runState = undefined;
                                cookies_1.cookieJar.removeAllCookies();
                                session.clearSessions();
                                return resetRenderedHTMLOrigins();
                            case 'get:rendered:html:origins':
                                return options.getRenderedHTMLOrigins();
                            case 'reset:rendered:html:origins':
                                return resetRenderedHTMLOrigins();
                            case 'cross:origin:cookies:received':
                                return this.localBus.emit('cross:origin:cookies:received');
                            case 'cross:origin:set:cookie':
                                return setCrossOriginCookie(args[0]);
                            case 'request:sent:with:credentials':
                                return this.localBus.emit('request:sent:with:credentials', args[0]);
                            case 'start:memory:profiling':
                                return
                            case 'end:memory:profiling':
                                return
                            case 'check:memory:pressure':
                                return
                            case 'protocol:test:before:run:async':
                                return (_a = this._protocolManager) === null || _a === void 0 ? void 0 : _a.beforeTest(args[0]);
                            case 'protocol:test:before:after:run:async':
                                return (_b = this._protocolManager) === null || _b === void 0 ? void 0 : _b.preAfterTest(args[0], args[1]);
                            case 'protocol:test:after:run:async':
                                return (_c = this._protocolManager) === null || _c === void 0 ? void 0 : _c.afterTest(args[0]);
                            case 'protocol:command:log:added':
                                return (_d = this._protocolManager) === null || _d === void 0 ? void 0 : _d.commandLogAdded(args[0]);
                            case 'protocol:command:log:changed':
                                return (_e = this._protocolManager) === null || _e === void 0 ? void 0 : _e.commandLogChanged(args[0]);
                            case 'protocol:viewport:changed':
                                return (_f = this._protocolManager) === null || _f === void 0 ? void 0 : _f.viewportChanged(args[0]);
                            case 'protocol:url:changed':
                                return (_g = this._protocolManager) === null || _g === void 0 ? void 0 : _g.urlChanged(args[0]);
                            case 'protocol:page:loading':
                                return (_h = this._protocolManager) === null || _h === void 0 ? void 0 : _h.pageLoading(args[0]);
                            case 'run:privileged':
                                return privileged_commands_manager_1.privilegedCommandsManager.runPrivilegedCommand(config, args[0]);
                            case 'telemetry':
                                return (_j = telemetry_1.telemetry.exporter()) === null || _j === void 0 ? void 0 : _j.send(args[0], () => { }, (err) => {
                                    debug('error exporting telemetry data from browser %s', err);
                                });
                            case 'close:extra:targets':
                                return options.closeExtraTargets();
                            default:
                                throw new Error(`You requested a backend event we cannot handle: ${eventName}`);
                        }
                    };
                    return bluebird_1.default.try(backendRequest)
                        .then((resp) => {
                        return cb({ response: resp });
                    }).catch((err) => {
                        return cb({ error: errors.cloneErr(err) });
                    });
                });
                socket.on('get:cached:test:state', (cb) => {
                    var _a;
                    const s = runState;
                    const cachedTestState = {
                        activeSessions: session.getActiveSessions(),
                    };
                    if (s) {
                        runState = undefined;
                        // if we have cached test state, then we need to reset
                        // the test state on the protocol manager
                        if (s.currentId) {
                            (_a = this._protocolManager) === null || _a === void 0 ? void 0 : _a.resetTest(s.currentId);
                        }
                    }
                    return cb(s || {}, cachedTestState);
                });
                socket.on('save:app:state', (state, cb) => {
                    options.onSavedStateChanged(state);
                    // we only use the 'ack' here in tests
                    if (cb) {
                        return cb();
                    }
                });
                socket.on('external:open', (url) => {
                    debug('received external:open %o', { url });
                    // using this instead of require('electron').shell.openExternal
                    // because CT runner does not spawn an electron shell
                    // if we eventually decide to exclusively launch CT from
                    // the desktop-gui electron shell, we should update this to use
                    // electron.shell.openExternal.
                    // cross platform way to open a new tab in default browser, or a new browser window
                    // if one does not already exist for the user's default browser.
                    const start = (process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open');
                    return require('child_process').exec(`${start} ${url}`);
                });
                socket.on('get:user:editor', (cb) => {
                    (0, editors_1.getUserEditor)(false)
                        .then(cb)
                        .catch(() => { });
                });
                socket.on('set:user:editor', (editor) => {
                    (0, editors_1.setUserEditor)(editor).catch(() => { });
                });
                socket.on('open:file', async (fileDetails) => {
                    // todo(lachlan): post 10.0 we should not pass the
                    // editor (in the `fileDetails.where` key) from the
                    // front-end, but rather rely on the server context
                    // to grab the preferred editor, like I'm doing here,
                    // so we do not need to
                    // maintain two sources of truth for the preferred editor
                    // adding this conditional to maintain backwards compat with
                    // existing runner and reporter API.
                    fileDetails.where = {
                        binary: (0, data_context_1.getCtx)().coreData.localSettings.preferences.preferredEditorBinary || 'computer',
                    };
                    debug('opening file %o', fileDetails);
                    (0, file_opener_1.openFile)(fileDetails);
                });
                if (this.supportsRunEvents) {
                    socket.on('plugins:before:spec', (spec, cb) => {
                        const beforeSpecSpan = telemetry_1.telemetry.startSpan({ name: 'lifecycle:before:spec' });
                        beforeSpecSpan === null || beforeSpecSpan === void 0 ? void 0 : beforeSpecSpan.setAttributes({ spec });
                        run_events_1.default.execute('before:spec', spec)
                            .then(cb)
                            .catch((error) => {
                            if (this.inRunMode) {
                                socket.disconnect();
                                throw error;
                            }
                            // surfacing the error to the app in open mode
                            cb({ error });
                        })
                            .finally(() => {
                            beforeSpecSpan === null || beforeSpecSpan === void 0 ? void 0 : beforeSpecSpan.end();
                        });
                    });
                }
                callbacks.onSocketConnection(socket);
                return;
            });
        });
        this.getIos().forEach((io) => {
            io === null || io === void 0 ? void 0 : io.of('/data-context').on('connection', (socket) => {
                socket.on('graphql:request', makeGraphQLServer_1.handleGraphQLSocketRequest);
            });
        });
        return {
            cdpIo: this._cdpIo,
            socketIo: this._socketIo,
        };
    }
    end() {
        this.ended = true;
        // TODO: we need an 'ack' from this end
        // event from the other side
        this.getIos().forEach((io) => {
            io === null || io === void 0 ? void 0 : io.emit('tests:finished');
        });
    }
    async resetBrowserTabsForNextTest(shouldKeepTabOpen) {
        if (this._sendResetBrowserTabsForNextTestMessage) {
            await this._sendResetBrowserTabsForNextTestMessage(shouldKeepTabOpen);
        }
    }
    async resetBrowserState() {
        if (this._sendResetBrowserStateMessage) {
            await this._sendResetBrowserStateMessage();
        }
    }
    isRunnerSocketConnected() {
        if (this._isRunnerSocketConnected) {
            return this._isRunnerSocketConnected();
        }
    }
    async sendFocusBrowserMessage() {
        await this._sendFocusBrowserMessage();
    }
    close() {
        this.getIos().forEach((io) => io === null || io === void 0 ? void 0 : io.close());
    }
    changeToUrl(url) {
        return this.toRunner('change:to:url', url);
    }
    /**
     * Sends the new telemetry context to the browser
     * @param context - telemetry context string
     * @returns
     */
    updateTelemetryContext(context) {
        return this.toRunner('update:telemetry:context', context);
    }
    setProtocolManager(protocolManager) {
        this._protocolManager = protocolManager;
    }
}
exports.SocketBase = SocketBase;
