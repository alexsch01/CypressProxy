"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectConfigManager = void 0;
const tslib_1 = require("tslib");
const errors_1 = require(process.argv[1]+"/../packages/errors");
const ProjectConfigIpc_1 = require("./ProjectConfigIpc");
const assert_1 = tslib_1.__importDefault(require("assert"));
const debug_1 = tslib_1.__importDefault(require("debug"));
const path_1 = tslib_1.__importDefault(require("path"));
const lodash_1 = tslib_1.__importDefault(require("lodash"));
const chokidar_1 = tslib_1.__importDefault(require("chokidar"));
const config_1 = require(process.argv[1]+"/../packages/config");
const CypressEnv_1 = require("./CypressEnv");
const autoBindDebug_1 = require("../util/autoBindDebug");
const scaffold_config_1 = require(process.argv[1]+"/../packages/scaffold-config");
const telemetry_1 = require(process.argv[1]+"/../packages/telemetry");
const debug = (0, debug_1.default)(`cypress:lifecycle:ProjectConfigManager`);
const UNDEFINED_SERIALIZED = '__cypress_undefined__';
class ProjectConfigManager {
    constructor(options) {
        this.options = options;
        this._pathToWatcherRecord = {};
        this._watchers = new Set();
        this._testingType = null;
        this._state = 'pending';
        this.onLoadError = async (error) => {
            await this.closeWatchers();
            this.options.onError(error);
        };
        this._cypressEnv = new CypressEnv_1.CypressEnv({
            envFilePath: this.envFilePath,
            validateConfigFile: (filePath, config) => {
                this.validateConfigFile(filePath, config);
            },
        });
        return (0, autoBindDebug_1.autoBindDebug)(this);
    }
    get isLoadingNodeEvents() {
        return this._state === 'loadingNodeEvents';
    }
    get isFullConfigReady() {
        return this._state === 'ready';
    }
    get isLoadingConfigFile() {
        return this._state === 'loadingConfig';
    }
    get isInError() {
        return this._state === 'errored';
    }
    get configFilePath() {
        (0, assert_1.default)(this._configFilePath, 'configFilePath is undefined');
        return this._configFilePath;
    }
    get eventProcessPid() {
        var _a;
        return (_a = this._eventsIpc) === null || _a === void 0 ? void 0 : _a.childProcessPid;
    }
    set configFilePath(configFilePath) {
        this._configFilePath = configFilePath;
    }
    setTestingType(testingType) {
        this._testingType = testingType;
    }
    get envFilePath() {
        return path_1.default.join(this.options.projectRoot, 'cypress.env.json');
    }
    get loadedConfigFile() {
        var _a, _b;
        return (_b = (_a = this._cachedLoadConfig) === null || _a === void 0 ? void 0 : _a.initialConfig) !== null && _b !== void 0 ? _b : null;
    }
    async initializeConfig() {
        try {
            this._state = 'loadingConfig';
            // Clean things up for a new load
            await this.closeWatchers();
            this._cachedLoadConfig = undefined;
            this._cachedFullConfig = undefined;
            const loadConfigReply = await this.loadConfig();
            // This is necessary as there is a weird timing issue where an error occurs and the config results get loaded
            // TODO: see if this can be !== 'errored'
            if (this._state === 'loadingConfig') {
                debug(`config is loaded for file`, this.configFilePath, this._testingType);
                this.validateConfigFile(this.configFilePath, loadConfigReply.initialConfig);
                this._state = 'loadedConfig';
                this._cachedLoadConfig = loadConfigReply;
                this.options.onInitialConfigLoaded(loadConfigReply.initialConfig);
                this.watchFiles([
                    ...loadConfigReply.requires,
                    this.configFilePath,
                ]);
                // Only call "to{App,Launchpad}" once the config is done loading.
                // Calling this in a "finally" would trigger this emission for every
                // call to get the config (which we do a lot)
                this.options.ctx.emitter.toLaunchpad();
                this.options.ctx.emitter.toApp();
            }
            return loadConfigReply.initialConfig;
        }
        catch (error) {
            debug(`catch %o`, error);
            if (this._eventsIpc) {
                this._eventsIpc.cleanupIpc();
            }
            this._state = 'errored';
            await this.closeWatchers();
            this.options.ctx.emitter.toLaunchpad();
            this.options.ctx.emitter.toApp();
            throw error;
        }
    }
    loadTestingType() {
        // If we have set a testingType, and it's not the "target" of the
        // registeredEvents (switching testing mode), we need to get a fresh
        // config IPC & re-execute the setupTestingType
        if (this._registeredEventsTarget && this._testingType !== this._registeredEventsTarget) {
            this.options.refreshLifecycle().catch(this.onLoadError);
        }
        else if (this._eventsIpc && !this._registeredEventsTarget && this._cachedLoadConfig) {
            this.setupNodeEvents(this._cachedLoadConfig)
                .then(async () => {
                if (this._testingType === 'component') {
                    await this.checkDependenciesForComponentTesting();
                }
            })
                .catch(this.onLoadError);
        }
    }
    async checkDependenciesForComponentTesting() {
        var _a, _b, _c;
        // if it's a function, for example, the user is created their own dev server,
        // and not using one of our presets. Assume they know what they are doing and
        // what dependencies they require.
        if (typeof ((_c = (_b = (_a = this._cachedLoadConfig) === null || _a === void 0 ? void 0 : _a.initialConfig) === null || _b === void 0 ? void 0 : _b.component) === null || _c === void 0 ? void 0 : _c.devServer) !== 'object') {
            return;
        }
        const devServerOptions = this._cachedLoadConfig.initialConfig.component.devServer;
        const bundler = scaffold_config_1.WIZARD_BUNDLERS.find((x) => x.type === devServerOptions.bundler);
        // Use a map since sometimes the same dependency can appear in `bundler` and `framework`,
        // for example webpack appears in both `bundler: 'webpack', framework: 'react-scripts'`
        const unsupportedDeps = new Map();
        if (!bundler) {
            return;
        }
        const isFrameworkSatisfied = async (bundler, framework) => {
            const deps = await framework.dependencies(bundler.type, this.options.projectRoot);
            debug('deps are %o', deps);
            for (const dep of deps) {
                debug('detecting %s in %s', dep.dependency.name, this.options.projectRoot);
                const res = await (0, scaffold_config_1.isDependencyInstalled)(dep.dependency, this.options.projectRoot);
                if (!res.satisfied) {
                    return false;
                }
            }
            return true;
        };
        const frameworks = this.options.ctx.coreData.wizard.frameworks.filter((x) => x.configFramework === devServerOptions.framework);
        const mismatchedFrameworkDeps = new Map();
        let isSatisfied = false;
        for (const framework of frameworks) {
            if (await isFrameworkSatisfied(bundler, framework)) {
                isSatisfied = true;
                break;
            }
            else {
                for (const dep of await framework.dependencies(bundler.type, this.options.projectRoot)) {
                    mismatchedFrameworkDeps.set(dep.dependency.type, dep);
                }
            }
        }
        if (!isSatisfied) {
            for (const dep of Array.from(mismatchedFrameworkDeps.values())) {
                if (!dep.satisfied) {
                    unsupportedDeps.set(dep.dependency.type, dep);
                }
            }
        }
        if (unsupportedDeps.size === 0) {
            return;
        }
        this.options.ctx.onWarning((0, errors_1.getError)('COMPONENT_TESTING_MISMATCHED_DEPENDENCIES', Array.from(unsupportedDeps.values())));
    }
    async setupNodeEvents(loadConfigReply) {
        var _a;
        const nodeEventsSpan = telemetry_1.telemetry.startSpan({ name: 'dataContext:setupNodeEvents' });
        (0, assert_1.default)(this._eventsIpc, 'Expected _eventsIpc to be defined at this point');
        this._state = 'loadingNodeEvents';
        try {
            (0, assert_1.default)(this._testingType, 'Cannot setup node events without a testing type');
            this._registeredEventsTarget = this._testingType;
            const config = await this.getFullInitialConfig();
            (_a = telemetry_1.telemetry.exporter()) === null || _a === void 0 ? void 0 : _a.attachProjectId(config.projectId);
            const setupNodeEventsReply = await this._eventsIpc.callSetupNodeEventsWithConfig(this._testingType, config, this.options.handlers);
            await this.handleSetupTestingTypeReply(this._eventsIpc, loadConfigReply, setupNodeEventsReply);
            this._state = 'ready';
        }
        catch (error) {
            debug(`catch setupNodeEvents %o`, error);
            this._state = 'errored';
            if (this._eventsIpc) {
                this._eventsIpc.cleanupIpc();
            }
            await this.closeWatchers();
            throw error;
        }
        finally {
            nodeEventsSpan === null || nodeEventsSpan === void 0 ? void 0 : nodeEventsSpan.end();
            this.options.ctx.emitter.toLaunchpad();
            this.options.ctx.emitter.toApp();
        }
    }
    async handleSetupTestingTypeReply(ipc, loadConfigReply, result) {
        var _a, _b;
        this.options.eventRegistrar.reset();
        for (const { event, eventId } of result.registrations) {
            debug('register plugins process event', event, 'with id', eventId);
            this.options.eventRegistrar.registerEvent(event, function (...args) {
                return new Promise((resolve, reject) => {
                    const invocationId = lodash_1.default.uniqueId('inv');
                    debug('call event', event, 'for invocation id', invocationId);
                    ipc.once(`promise:fulfilled:${invocationId}`, (err, value) => {
                        if (err) {
                            debug('promise rejected for id %s %o', invocationId, ':', err.stack);
                            reject(lodash_1.default.extend(new Error(err.message), err));
                            return;
                        }
                        if (value === UNDEFINED_SERIALIZED) {
                            value = undefined;
                        }
                        debug(`promise resolved for id '${invocationId}' with value`, value);
                        return resolve(value);
                    });
                    const ids = { invocationId, eventId };
                    // no argument is passed for cy.task()
                    // This is necessary because undefined becomes null when it is sent through ipc.
                    if (event === 'task' && args[1] === undefined) {
                        args[1] = {
                            __cypress_task_no_argument__: true,
                        };
                    }
                    ipc.send('execute:plugins', event, ids, args);
                });
            });
        }
        const cypressEnv = await this.loadCypressEnvFile();
        const fullConfig = await this.buildBaseFullConfig(loadConfigReply.initialConfig, cypressEnv, this.options.ctx.modeOptions);
        const finalConfig = this._cachedFullConfig = (0, config_1.updateWithPluginValues)(fullConfig, (_a = result.setupConfig) !== null && _a !== void 0 ? _a : {}, (_b = this._testingType) !== null && _b !== void 0 ? _b : 'e2e');
        // Check if the config file has a before:browser:launch task, and if it's the case
        // we should restart the browser if it is open
        const onFinalConfigLoadedOptions = {
            shouldRestartBrowser: result.registrations.some((registration) => registration.event === 'before:browser:launch'),
        };
        await this.options.onFinalConfigLoaded(finalConfig, onFinalConfigLoadedOptions);
        this.watchFiles([
            ...result.requires,
            this.envFilePath,
        ]);
        return result;
    }
    resetLoadingState() {
        this._loadConfigPromise = undefined;
        this._registeredEventsTarget = undefined;
        this._state = 'pending';
    }
    loadConfig() {
        if (!this._loadConfigPromise) {
            // If there's already a dangling IPC from the previous switch of testing type, we want to clean this up
            if (this._eventsIpc) {
                this._eventsIpc.cleanupIpc();
            }
            this._eventsIpc = new ProjectConfigIpc_1.ProjectConfigIpc(this.options.ctx.coreData.app.nodePath, this.options.projectRoot, this.configFilePath, this.options.configFile, (cypressError, title) => {
                this._state = 'errored';
                this.options.ctx.onError(cypressError, title);
            }, this.options.ctx.onWarning);
            this._loadConfigPromise = this._eventsIpc.loadConfig();
        }
        return this._loadConfigPromise;
    }
    validateConfigFile(file, config) {
        (0, config_1.validate)(config, (errMsg) => {
            if (lodash_1.default.isString(errMsg)) {
                throw (0, errors_1.getError)('CONFIG_VALIDATION_MSG_ERROR', 'configFile', file || null, errMsg);
            }
            throw (0, errors_1.getError)('CONFIG_VALIDATION_ERROR', 'configFile', file || null, errMsg);
        }, this._testingType);
        return (0, config_1.validateNoBreakingConfigLaunchpad)(config, (type, obj) => {
            const error = (0, errors_1.getError)(type, obj);
            this.options.ctx.onWarning(error);
            return error;
        }, (type, obj) => {
            const error = (0, errors_1.getError)(type, obj);
            this.options.onError(error);
            throw error;
        });
    }
    watchFiles(paths) {
        if (this.options.ctx.isRunMode) {
            return;
        }
        const filtered = paths.filter((p) => !p.includes('/node_modules/'));
        for (const path of filtered) {
            if (!this._pathToWatcherRecord[path]) {
                this._pathToWatcherRecord[path] = this.addWatcherFor(path);
            }
        }
    }
    addWatcherFor(file) {
        const w = this.addWatcher(file);
        w.on('all', (evt) => {
            debug(`changed ${file}: ${evt}`);
            this.options.refreshLifecycle().catch(this.onLoadError);
        });
        w.on('error', (err) => {
            debug('error watching config files %O', err);
            this.options.ctx.onWarning((0, errors_1.getError)('UNEXPECTED_INTERNAL_ERROR', err));
        });
        return w;
    }
    addWatcher(file) {
        const w = chokidar_1.default.watch(file, {
            ignoreInitial: true,
            cwd: this.options.projectRoot,
            ignorePermissionErrors: true,
        });
        this._watchers.add(w);
        return w;
    }
    validateConfigRoot(config, testingType) {
        return (0, config_1.validateNoBreakingConfigRoot)(config, (type, obj) => {
            return (0, errors_1.getError)(type, obj);
        }, (type, obj) => {
            throw (0, errors_1.getError)(type, obj);
        }, testingType);
    }
    validateTestingTypeConfig(config, testingType) {
        return (0, config_1.validateNoBreakingTestingTypeConfig)(config, testingType, (type, ...args) => {
            return (0, errors_1.getError)(type, ...args);
        }, (type, ...args) => {
            throw (0, errors_1.getError)(type, ...args);
        });
    }
    get repoRoot() {
        var _a;
        /*
          Used to detect the correct file path when a test fails.
          It is derived and assigned in the packages/driver in stack_utils.
          It's needed to show the correct link to files in repo mgmt tools like GitHub in Cypress Cloud.
          Right now we assume the repoRoot is where the `.git` dir is located.
        */
        return (_a = this.options.ctx.git) === null || _a === void 0 ? void 0 : _a.gitBaseDir;
    }
    async buildBaseFullConfig(configFileContents, envFile, options, withBrowsers = true) {
        var _a, _b, _c, _d, _e;
        (0, assert_1.default)(this._testingType, 'Cannot build base full config without a testing type');
        this.validateConfigRoot(configFileContents, this._testingType);
        const testingTypeOverrides = (_a = configFileContents[this._testingType]) !== null && _a !== void 0 ? _a : {};
        const optionsOverrides = (_c = (_b = options.config) === null || _b === void 0 ? void 0 : _b[this._testingType]) !== null && _c !== void 0 ? _c : {};
        this.validateTestingTypeConfig(testingTypeOverrides, this._testingType);
        this.validateTestingTypeConfig(optionsOverrides, this._testingType);
        // TODO: pass in options.config overrides separately, so they are reflected in the UI
        configFileContents = { ...configFileContents, ...testingTypeOverrides, ...optionsOverrides };
        // TODO: Convert this to be synchronous, it's just FS checks
        let fullConfig = await (0, config_1.setupFullConfigWithDefaults)({
            cliConfig: (_d = options.config) !== null && _d !== void 0 ? _d : {},
            projectName: path_1.default.basename(this.options.projectRoot),
            projectRoot: this.options.projectRoot,
            repoRoot: this.repoRoot,
            config: lodash_1.default.cloneDeep(configFileContents),
            envFile: lodash_1.default.cloneDeep(envFile),
            options: {
                ...options,
                testingType: this._testingType,
                configFile: path_1.default.basename(this.configFilePath),
            },
            configFile: this.options.ctx.lifecycleManager.configFile,
        }, this.options.ctx.file.getFilesByGlob);
        if (withBrowsers) {
            const browsers = await this.options.ctx.browser.machineBrowsers();
            if (!fullConfig.browsers || fullConfig.browsers.length === 0) {
                // @ts-ignore - we don't know if the browser is headed or headless at this point.
                // this is handled in open_project#launch.
                fullConfig.browsers = browsers;
                fullConfig.resolved.browsers = { 'value': fullConfig.browsers, 'from': 'runtime' };
            }
            fullConfig.browsers = (_e = fullConfig.browsers) === null || _e === void 0 ? void 0 : _e.map((browser) => {
                if (browser.family === 'webkit' && !fullConfig.experimentalWebKitSupport) {
                    return {
                        ...browser,
                        disabled: true,
                        warning: '`playwright-webkit` is installed and WebKit is detected, but `experimentalWebKitSupport` is not enabled in your Cypress config. Set it to `true` to use WebKit.',
                    };
                }
                if (browser.family !== 'chromium' && !fullConfig.chromeWebSecurity) {
                    return {
                        ...browser,
                        warning: browser.warning || (0, errors_1.getError)('CHROME_WEB_SECURITY_NOT_SUPPORTED', browser.name).message,
                    };
                }
                return browser;
            });
            // If we have withBrowsers set to false, it means we're coming from the legacy config.get API
            // in tests, which shouldn't be validating the config
            this.validateConfigFile(this.options.configFile, fullConfig);
        }
        return lodash_1.default.cloneDeep(fullConfig);
    }
    async getFullInitialConfig(options = this.options.ctx.modeOptions, withBrowsers = true) {
        // return cached configuration for new spec and/or new navigating load when Cypress is running tests
        if (this._cachedFullConfig) {
            return this._cachedFullConfig;
        }
        const [configFileContents, envFile] = await Promise.all([
            this.getConfigFileContents(),
            this.reloadCypressEnvFile(),
        ]);
        this._cachedFullConfig = await this.buildBaseFullConfig(configFileContents, envFile, options, withBrowsers);
        return this._cachedFullConfig;
    }
    async getConfigFileContents() {
        var _a, _b;
        if ((_a = this._cachedLoadConfig) === null || _a === void 0 ? void 0 : _a.initialConfig) {
            return (_b = this._cachedLoadConfig) === null || _b === void 0 ? void 0 : _b.initialConfig;
        }
        return this.initializeConfig();
    }
    async loadCypressEnvFile() {
        return this._cypressEnv.loadCypressEnvFile();
    }
    async reloadCypressEnvFile() {
        this._cypressEnv = new CypressEnv_1.CypressEnv({
            envFilePath: this.envFilePath,
            validateConfigFile: (filePath, config) => {
                this.validateConfigFile(filePath, config);
            },
        });
        return this._cypressEnv.loadCypressEnvFile();
    }
    isTestingTypeConfigured(testingType) {
        var _a;
        const config = this.loadedConfigFile;
        if (!config) {
            return false;
        }
        if (!lodash_1.default.has(config, testingType)) {
            return false;
        }
        if (testingType === 'component') {
            return Boolean((_a = config.component) === null || _a === void 0 ? void 0 : _a.devServer);
        }
        return true;
    }
    /**
     * Informs the child process if the main process will soon disconnect.
     * @returns promise
     */
    mainProcessWillDisconnect() {
        return new Promise((resolve, reject) => {
            if (!this._eventsIpc) {
                debug(`mainProcessWillDisconnect message not set, no IPC available`);
                reject();
                return;
            }
            this._eventsIpc.send('main:process:will:disconnect');
            // If for whatever reason we don't get an ack in 5s, bail.
            const timeoutId = setTimeout(() => {
                debug(`mainProcessWillDisconnect message timed out`);
                reject();
            }, 5000);
            this._eventsIpc.on('main:process:will:disconnect:ack', () => {
                clearTimeout(timeoutId);
                resolve();
            });
        });
    }
    async closeWatchers() {
        await Promise.all(Array.from(this._watchers).map((watcher) => {
            return watcher.close().catch((error) => {
                // Watcher close errors are ignored, we cannot meaningfully handle these
            });
        }));
        this._watchers = new Set();
        this._pathToWatcherRecord = {};
    }
    async destroy() {
        if (this._eventsIpc) {
            this._eventsIpc.cleanupIpc();
        }
        this._state = 'pending';
        this._cachedLoadConfig = undefined;
        this._cachedFullConfig = undefined;
        this._registeredEventsTarget = undefined;
        await this.closeWatchers();
    }
}
exports.ProjectConfigManager = ProjectConfigManager;
