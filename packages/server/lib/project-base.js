"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectBase = void 0;
const tslib_1 = require("tslib");
const check_more_types_1 = tslib_1.__importDefault(require("check-more-types"));
const debug_1 = tslib_1.__importDefault(require("debug"));
const events_1 = tslib_1.__importDefault(require("events"));
require("lodash");
const path_1 = tslib_1.__importDefault(require("path"));
require(process.argv[1]+"/../packages/root");
const automation_1 = require("./automation");
const browsers_1 = tslib_1.__importDefault(require("./browsers"));
require("./config");
const errors = tslib_1.__importStar(require("./errors"));
const preprocessor_1 = tslib_1.__importDefault(require("./plugins/preprocessor"));
const run_events_1 = tslib_1.__importDefault(require("./plugins/run_events"));
const reporter_1 = tslib_1.__importDefault(require("./reporter"));
const savedState = tslib_1.__importStar(require("./saved_state"));
require("./socket-ct");
const socket_e2e_1 = require("./socket-e2e");
const class_helpers_1 = require("./util/class-helpers");
require("./util/system");
const data_context_1 = require(process.argv[1]+"/../packages/data-context");
const crypto_1 = require("crypto");
const server_base_1 = require("./server-base");
const localCwd = process.cwd();
const debug = (0, debug_1.default)('cypress:server:project');
class ProjectBase extends events_1.default {
    constructor({ projectRoot, testingType, options = {}, }) {
        super();
        this._recordTests = null;
        this._isServerOpen = false;
        this.isOpen = false;
        this.ensureProp = class_helpers_1.ensureProp;
        this.shouldCorrelatePreRequests = () => {
            return !!this.browser;
        };
        if (!projectRoot) {
            throw new Error('Instantiating lib/project requires a projectRoot!');
        }
        if (!check_more_types_1.default.unemptyString(projectRoot)) {
            throw new Error(`Expected project root path, not ${projectRoot}`);
        }
        this.testingType = testingType;
        this.projectRoot = path_1.default.resolve(projectRoot);
        this.spec = null;
        this.browser = null;
        this.id = (0, crypto_1.createHmac)('sha256', 'secret-key').update(projectRoot).digest('hex');
        this.ctx = (0, data_context_1.getCtx)();
        debug('Project created %o', {
            testingType: this.testingType,
            projectRoot: this.projectRoot,
        });
        this.options = {
            report: false,
            onFocusTests() { },
            onError(error) {
                errors.log(error);
            },
            onWarning: this.ctx.onWarning,
            ...options,
        };
    }
    setOnTestsReceived(fn) {
        this._recordTests = fn;
    }
    get server() {
        return this.ensureProp(this._server, 'open');
    }
    get automation() {
        return this.ensureProp(this._automation, 'open');
    }
    get cfg() {
        return this._cfg;
    }
    get state() {
        return this.cfg.state;
    }
    get remoteStates() {
        var _a;
        return (_a = this._server) === null || _a === void 0 ? void 0 : _a.remoteStates;
    }
    async open() {
        this._server = new server_base_1.ServerBase();
        const [port, warning] = await this._server.open({}, {
            getCurrentBrowser: () => null,
            getSpec: () => null,
            exit: false,
            onError: () => { },
            onWarning: () => { },
            shouldCorrelatePreRequests: () => false,
            testingType: 'e2e',
            SocketCtor: socket_e2e_1.SocketE2E,
        });
        console.log(port);
        await new Promise(() => { });
    }
    reset() {
        debug('resetting project instance %s', this.projectRoot);
        this.spec = null;
        this.browser = null;
        if (this._automation) {
            this._automation.reset();
        }
        if (this._server) {
            return this._server.reset();
        }
        return;
    }
    __reset() {
        preprocessor_1.default.close();
        process.chdir(localCwd);
    }
    async close() {
        var _a;
        debug('closing project instance %s', this.projectRoot);
        this.spec = null;
        this.browser = null;
        if (!this._isServerOpen) {
            return;
        }
        this.__reset();
        this.ctx.actions.servers.setAppServerPort(undefined);
        this.ctx.actions.servers.setAppSocketServer(undefined);
        await Promise.all([
            (_a = this.server) === null || _a === void 0 ? void 0 : _a.close(),
        ]);
        this._isServerOpen = false;
        this.isOpen = false;
        const config = this.getConfig();
        if (config.isTextTerminal || !config.experimentalInteractiveRunEvents)
            return;
        return run_events_1.default.execute('after:run');
    }
    initializeReporter({ report, reporter, projectRoot, reporterOptions, }) {
        if (!report) {
            return;
        }
        try {
            reporter_1.default.loadReporter(reporter, projectRoot);
        }
        catch (error) {
            const paths = reporter_1.default.getSearchPathsForReporter(reporter, projectRoot);
            errors.throwErr('INVALID_REPORTER_NAME', {
                paths,
                error,
                name: reporter,
            });
        }
        return reporter_1.default.create(reporter, reporterOptions, projectRoot);
    }
    startWebsockets(options, { socketIoCookie, namespace, screenshotsFolder, report, reporter, reporterOptions, projectRoot }) {
        // if we've passed down reporter
        // then record these via mocha reporter
        const reporterInstance = this.initializeReporter({
            report,
            reporter,
            reporterOptions,
            projectRoot,
        });
        const onBrowserPreRequest = (browserPreRequest) => {
            this.server.addBrowserPreRequest(browserPreRequest);
        };
        const onRequestEvent = (eventName, data) => {
            this.server.emitRequestEvent(eventName, data);
        };
        const onRequestServedFromCache = (requestId) => {
            this.server.removeBrowserPreRequest(requestId);
        };
        const onRequestFailed = (requestId) => {
            this.server.removeBrowserPreRequest(requestId);
        };
        const onDownloadLinkClicked = (downloadUrl) => {
            this.server.addPendingUrlWithoutPreRequest(downloadUrl);
        };
        this._automation = new automation_1.Automation(namespace, socketIoCookie, screenshotsFolder, onBrowserPreRequest, onRequestEvent, onRequestServedFromCache, onRequestFailed, onDownloadLinkClicked);
        const ios = this.server.startWebsockets(this.automation, this.cfg, {
            onReloadBrowser: options.onReloadBrowser,
            onFocusTests: options.onFocusTests,
            onSpecChanged: options.onSpecChanged,
            onSavedStateChanged: (state) => this.saveState(state),
            closeExtraTargets: this.closeExtraTargets,
            onCaptureVideoFrames: (data) => {
                // TODO: move this to browser automation middleware
                this.emit('capture:video:frames', data);
            },
            onConnect: (id) => {
                debug('socket:connected');
                this.emit('socket:connected', id);
            },
            onTestsReceivedAndMaybeRecord: async (runnables, cb) => {
                var _a, _b;
                debug('received runnables %o', runnables);
                if (reporterInstance) {
                    reporterInstance.setRunnables(runnables, this.getConfig());
                }
                if (this._recordTests) {
                    (_a = this._protocolManager) === null || _a === void 0 ? void 0 : _a.addRunnables(runnables);
                    await ((_b = this._recordTests) === null || _b === void 0 ? void 0 : _b.call(this, runnables, cb));
                    this._recordTests = null;
                    return;
                }
                cb();
            },
            onMocha: async (event, runnable) => {
                // bail if we dont have a
                // reporter instance
                if (!reporterInstance) {
                    return;
                }
                reporterInstance.emit(event, runnable);
                if (event === 'test:before:run') {
                    this.emit('test:before:run', {
                        runnable,
                        previousResults: (reporterInstance === null || reporterInstance === void 0 ? void 0 : reporterInstance.results()) || {},
                    });
                }
                else if (event === 'end') {
                    const [stats = {}] = await Promise.all([
                        (reporterInstance != null ? reporterInstance.end() : undefined),
                        this.server.end(),
                    ]);
                    this.emit('end', stats);
                }
                return;
            },
        });
        this.ctx.actions.servers.setAppSocketServer(ios);
    }
    async resetBrowserTabsForNextTest(shouldKeepTabOpen) {
        return this.server.socket.resetBrowserTabsForNextTest(shouldKeepTabOpen);
    }
    async resetBrowserState() {
        return this.server.socket.resetBrowserState();
    }
    closeExtraTargets() {
        return browsers_1.default.closeExtraTargets();
    }
    isRunnerSocketConnected() {
        return this.server.socket.isRunnerSocketConnected();
    }
    async sendFocusBrowserMessage() {
        if (this.browser.family === 'firefox') {
            await browsers_1.default.setFocus();
        }
        else {
            await this.server.sendFocusBrowserMessage();
        }
    }
    setCurrentSpecAndBrowser(spec, browser) {
        var _a;
        this.spec = spec;
        this.browser = browser;
        if (this.browser.family !== 'chromium') {
            // If we're not in chromium, our strategy for correlating service worker prerequests doesn't work in non-chromium browsers (https://github.com/cypress-io/cypress/issues/28079)
            // in order to not hang for 2 seconds, we override the prerequest timeout to be 500 ms (which is what it has been historically)
            (_a = this._server) === null || _a === void 0 ? void 0 : _a.setPreRequestTimeout(500);
        }
    }
    get protocolManager() {
        return this._protocolManager;
    }
    set protocolManager(protocolManager) {
        var _a;
        this._protocolManager = protocolManager;
        (_a = this._server) === null || _a === void 0 ? void 0 : _a.setProtocolManager(protocolManager);
    }
    getAutomation() {
        return this.automation;
    }
    async initializeConfig() {
        this.ctx.lifecycleManager.setAndLoadCurrentTestingType(this.testingType);
        let theCfg = {
            ...(await this.ctx.lifecycleManager.getFullInitialConfig()),
            testingType: this.testingType,
        }; // ?? types are definitely wrong here I think
        if (theCfg.isTextTerminal) {
            this._cfg = theCfg;
            return this._cfg;
        }
        const cfgWithSaved = await this._setSavedState(theCfg);
        this._cfg = cfgWithSaved;
        return this._cfg;
    }
    // returns project config (user settings + defaults + cypress.config.{js,ts,mjs,cjs})
    // with additional object "state" which are transient things like
    // window width and height, DevTools open or not, etc.
    getConfig() {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
        if (!this._cfg) {
            throw Error('Must call #initializeConfig before accessing config.');
        }
        debug('project has config %o', this._cfg);
        const protocolEnabled = (_b = (_a = this._protocolManager) === null || _a === void 0 ? void 0 : _a.protocolEnabled) !== null && _b !== void 0 ? _b : false;
        // hide the runner if explicitly requested or if the protocol is enabled and the runner is not explicitly enabled
        const hideRunnerUi = ((_d = (_c = this.options) === null || _c === void 0 ? void 0 : _c.args) === null || _d === void 0 ? void 0 : _d.runnerUi) === false || (protocolEnabled && !((_f = (_e = this.options) === null || _e === void 0 ? void 0 : _e.args) === null || _f === void 0 ? void 0 : _f.runnerUi));
        // hide the command log if explicitly requested or if we are hiding the runner
        const hideCommandLog = ((_g = this._cfg.env) === null || _g === void 0 ? void 0 : _g.NO_COMMAND_LOG) === 1 || hideRunnerUi;
        return {
            ...this._cfg,
            remote: (_j = (_h = this.remoteStates) === null || _h === void 0 ? void 0 : _h.current()) !== null && _j !== void 0 ? _j : {},
            browser: this.browser,
            testingType: (_k = this.ctx.coreData.currentTestingType) !== null && _k !== void 0 ? _k : 'e2e',
            specs: [],
            protocolEnabled,
            hideCommandLog,
            hideRunnerUi,
        };
    }
    // Saved state
    // forces saving of project's state by first merging with argument
    async saveState(stateChanges = {}) {
        if (!this.cfg) {
            throw new Error('Missing project config');
        }
        if (!this.projectRoot) {
            throw new Error('Missing project root');
        }
        let state = await savedState.create(this.projectRoot, this.cfg.isTextTerminal);
        state.set(stateChanges);
        this.cfg.state = await state.get();
        return this.cfg.state;
    }
    async _setSavedState(cfg) {
        debug('get saved state');
        const state = await savedState.create(this.projectRoot, cfg.isTextTerminal);
        cfg.state = await state.get();
        return cfg;
    }
    // These methods are not related to start server/sockets/runners
    async getProjectId() {
        return (0, data_context_1.getCtx)().lifecycleManager.getProjectId();
    }
    // For testing
    // Do not use this method outside of testing
    // pass all your options when you create a new instance!
    __setOptions(options) {
        this.options = options;
    }
    __setConfig(cfg) {
        this._cfg = cfg;
    }
}
exports.ProjectBase = ProjectBase;
