"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectLifecycleManager = void 0;
const tslib_1 = require("tslib");
/**
 * The "Project Lifecycle" is the centralized manager for the project,
 * config, browser, and the number of possible states that can occur based
 * on inputs that change these behaviors.
 *
 * See `guides/app-lifecycle.md` for documentation on the project & possible
 * states that exist, and how they are managed.
 */
const path_1 = tslib_1.__importDefault(require("path"));
const lodash_1 = tslib_1.__importDefault(require("lodash"));
const resolve_1 = tslib_1.__importDefault(require("resolve"));
const fs_1 = tslib_1.__importDefault(require("fs"));
const errors_1 = require(process.argv[1]+"/../packages/errors");
const assert_1 = tslib_1.__importDefault(require("assert"));
const autoBindDebug_1 = require("../util/autoBindDebug");
const sources_1 = require("../sources");
const ProjectConfigManager_1 = require("./ProjectConfigManager");
const p_defer_1 = tslib_1.__importDefault(require("p-defer"));
const EventRegistrar_1 = require("./EventRegistrar");
const pluginHandlers_1 = require("../util/pluginHandlers");
const scaffold_config_1 = require(process.argv[1]+"/../packages/scaffold-config");
const config_1 = require(process.argv[1]+"/../packages/config");
const types_1 = require(process.argv[1]+"/../packages/types");
const telemetry_1 = require(process.argv[1]+"/../packages/telemetry");
const POTENTIAL_CONFIG_FILES = [
    'cypress.config.ts',
    'cypress.config.mjs',
    'cypress.config.cjs',
    'cypress.config.js',
];
const PROJECT_META_STATE = {
    isUsingTypeScript: false,
    hasLegacyCypressJson: false,
    allFoundConfigFiles: [],
    hasCypressEnvFile: false,
    hasSpecifiedConfigViaCLI: false,
    hasValidConfigFile: false,
    needsCypressJsonMigration: false,
    isProjectUsingESModules: false,
};
class ProjectLifecycleManager {
    constructor(ctx) {
        this.ctx = ctx;
        this._currentTestingType = null;
        this._projectMetaState = { ...PROJECT_META_STATE };
        /**
         * When there is an error during any part of the lifecycle
         * initiation, we pass it through here. This allows us to intercept
         * centrally in the e2e tests, as well as notify the "pending initialization"
         * for run mode
         */
        this.onLoadError = (err) => {
            if (this.ctx.isRunMode && this._pendingInitialize) {
                this._pendingInitialize.reject(err);
            }
            else {
                this.ctx.onError(err, 'Cypress configuration error');
            }
        };
        this._eventRegistrar = new EventRegistrar_1.EventRegistrar();
        if (ctx.coreData.currentProject) {
            this._setCurrentProject(ctx.coreData.currentProject);
        }
        return (0, autoBindDebug_1.autoBindDebug)(this);
    }
    get git() {
        return this.ctx.coreData.currentProjectGitInfo;
    }
    async getProjectId() {
        var _a;
        try {
            // No need to kick off config initialization if we need to migrate
            if (this.ctx.migration.needsCypressJsonMigration()) {
                return null;
            }
            const contents = await this.ctx.project.getConfig();
            return (_a = contents.projectId) !== null && _a !== void 0 ? _a : null;
        }
        catch (_b) {
            return null;
        }
    }
    get metaState() {
        return Object.freeze(this._projectMetaState);
    }
    get configFile() {
        var _a, _b, _c;
        return (_c = (_a = this.ctx.modeOptions.configFile) !== null && _a !== void 0 ? _a : (((_b = this._configManager) === null || _b === void 0 ? void 0 : _b.configFilePath) && path_1.default.basename(this._configManager.configFilePath))) !== null && _c !== void 0 ? _c : 'cypress.config.js';
    }
    get configFilePath() {
        (0, assert_1.default)(this._configManager, 'Cannot retrieve config file path without a config manager');
        return this._configManager.configFilePath;
    }
    setConfigFilePath(fileName) {
        (0, assert_1.default)(this._configManager, 'Cannot set config file path without a config manager');
        this._configManager.configFilePath = this._pathToFile(fileName);
    }
    get envFilePath() {
        return path_1.default.join(this.projectRoot, 'cypress.env.json');
    }
    get browsers() {
        if (this.loadedFullConfig) {
            return this.loadedFullConfig.browsers;
        }
        return null;
    }
    get isLoadingConfigFile() {
        var _a;
        return (_a = this._configManager) === null || _a === void 0 ? void 0 : _a.isLoadingConfigFile;
    }
    get isLoadingNodeEvents() {
        var _a;
        return (_a = this._configManager) === null || _a === void 0 ? void 0 : _a.isLoadingNodeEvents;
    }
    get isFullConfigReady() {
        var _a;
        return (_a = this._configManager) === null || _a === void 0 ? void 0 : _a.isFullConfigReady;
    }
    get loadedConfigFile() {
        var _a;
        return (_a = this._cachedInitialConfig) !== null && _a !== void 0 ? _a : null;
    }
    get loadedFullConfig() {
        var _a;
        return (_a = this._cachedFullConfig) !== null && _a !== void 0 ? _a : null;
    }
    get projectRoot() {
        (0, assert_1.default)(this._projectRoot, 'Expected projectRoot to be set in ProjectLifecycleManager');
        return this._projectRoot;
    }
    get projectTitle() {
        return path_1.default.basename(this.projectRoot);
    }
    get fileExtensionToUse() {
        return this.metaState.isUsingTypeScript ? 'ts' : 'js';
    }
    get eventProcessPid() {
        var _a;
        return (_a = this._configManager) === null || _a === void 0 ? void 0 : _a.eventProcessPid;
    }
    async clearCurrentProject() {
        await this.resetInternalState();
        this._initializedProject = undefined;
        this._projectRoot = undefined;
    }
    getPackageManagerUsed(projectRoot) {
        if (fs_1.default.existsSync(path_1.default.join(projectRoot, 'package-lock.json'))) {
            return 'npm';
        }
        if (fs_1.default.existsSync(path_1.default.join(projectRoot, 'yarn.lock'))) {
            return 'yarn';
        }
        if (fs_1.default.existsSync(path_1.default.join(projectRoot, 'pnpm-lock.yaml'))) {
            return 'pnpm';
        }
        return 'npm';
    }
    createConfigManager() {
        return new ProjectConfigManager_1.ProjectConfigManager({
            ctx: this.ctx,
            configFile: this.configFile,
            projectRoot: this.projectRoot,
            handlers: (0, pluginHandlers_1.getServerPluginHandlers)(),
            hasCypressEnvFile: this._projectMetaState.hasCypressEnvFile,
            eventRegistrar: this._eventRegistrar,
            onError: this.onLoadError,
            onInitialConfigLoaded: (initialConfig) => {
                this._cachedInitialConfig = initialConfig;
                this.ctx.emitter.toLaunchpad();
                this.ctx.emitter.toApp();
            },
            onFinalConfigLoaded: async (finalConfig, options) => {
                var _a;
                if (this._currentTestingType && finalConfig.specPattern) {
                    await this.ctx.actions.project.setSpecsFoundBySpecPattern({
                        projectRoot: this.projectRoot,
                        testingType: this._currentTestingType,
                        specPattern: this.ctx.modeOptions.spec || finalConfig.specPattern,
                        configSpecPattern: finalConfig.specPattern,
                        excludeSpecPattern: finalConfig.excludeSpecPattern,
                        additionalIgnorePattern: finalConfig.additionalIgnorePattern,
                    });
                }
                if (this._currentTestingType === 'component') {
                    const span = telemetry_1.telemetry.startSpan({ name: 'dataContext:ct:startDevServer' });
                    const devServerOptions = await this.ctx._apis.projectApi.getDevServer().start({ specs: this.ctx.project.specs, config: finalConfig });
                    // If we received a cypressConfig.port we want to null it out
                    // because we propagated it into the devServer.port and it is
                    // later set as baseUrl which cypress is launched into
                    //
                    // The special case is cypress in cypress testing. If that's the case, we still need
                    // the wrapper cypress to be running on 4455
                    if (!process.env.CYPRESS_INTERNAL_E2E_TESTING_SELF) {
                        finalConfig.port = null;
                    }
                    else {
                        finalConfig.port = 4455;
                    }
                    span === null || span === void 0 ? void 0 : span.end();
                    if (!(devServerOptions === null || devServerOptions === void 0 ? void 0 : devServerOptions.port)) {
                        throw (0, errors_1.getError)('CONFIG_FILE_DEV_SERVER_INVALID_RETURN', devServerOptions);
                    }
                    finalConfig.baseUrl = `http://localhost:${devServerOptions === null || devServerOptions === void 0 ? void 0 : devServerOptions.port}`;
                }
                const pingBaseUrl = this._cachedFullConfig && this._cachedFullConfig.baseUrl !== finalConfig.baseUrl;
                const restartOnChange = (0, config_1.validateNeedToRestartOnChange)(this._cachedFullConfig, finalConfig);
                this._cachedFullConfig = finalConfig;
                // This happens automatically with openProjectCreate in run mode
                if (!this.ctx.isRunMode) {
                    const shouldRelaunchBrowser = this.ctx.coreData.app.browserStatus !== 'closed';
                    if (!this._initializedProject) {
                        this._initializedProject = await this.ctx.actions.project.initializeActiveProject({});
                    }
                    else if (restartOnChange.server) {
                        this.ctx.project.setRelaunchBrowser(shouldRelaunchBrowser);
                        this._initializedProject = await this.ctx.actions.project.initializeActiveProject({});
                    }
                    else if ((restartOnChange.browser || options.shouldRestartBrowser) && shouldRelaunchBrowser) {
                        this.ctx.project.setRelaunchBrowser(shouldRelaunchBrowser);
                        await this.ctx.actions.browser.closeBrowser();
                        await this.ctx.actions.browser.relaunchBrowser();
                    }
                    if (pingBaseUrl) {
                        this.ctx.actions.project.pingBaseUrl().catch(this.onLoadError);
                    }
                }
                await this.setInitialActiveBrowser();
                (_a = this._pendingInitialize) === null || _a === void 0 ? void 0 : _a.resolve(finalConfig);
                this.ctx.emitter.configChange();
            },
            refreshLifecycle: async () => this.refreshLifecycle(),
        });
    }
    /**
     * Sets the initial `activeBrowser` depending on these criteria, in order of preference:
     *  1. The value of `--browser` passed via CLI.
     *  2. The last browser selected in `open` mode (by name and channel) for this project.
     *  3. The first browser found.
     */
    async setInitialActiveBrowser() {
        var _a;
        if (this.ctx.coreData.cliBrowser) {
            await this.setActiveBrowserByNameOrPath(this.ctx.coreData.cliBrowser);
            const preferences = await this.ctx._apis.localSettingsApi.getPreferences();
            const hasWelcomeBeenDismissed = Boolean((_a = preferences.majorVersionWelcomeDismissed) === null || _a === void 0 ? void 0 : _a[types_1.MAJOR_VERSION_FOR_CONTENT]);
            // only continue if the browser was successfully set - we must have an activeBrowser once this function resolves
            // but if the user needs to dismiss a landing page, don't continue, the active browser will be opened
            // by a mutation called from the client side when the user dismisses the welcome screen
            if (this.ctx.coreData.activeBrowser && hasWelcomeBeenDismissed) {
                // if `cypress open` was launched with a `--project` and `--testingType`, go ahead and launch the `--browser`
                if (this.ctx.modeOptions.project && this.ctx.modeOptions.testingType) {
                    await this.ctx.actions.project.launchProject(this.ctx.coreData.currentTestingType);
                }
                return;
            }
        }
        // lastBrowser is cached per-project.
        const prefs = await this.ctx.project.getProjectPreferences(path_1.default.basename(this.projectRoot));
        const browsers = await this.ctx.browser.allBrowsers();
        if (!browsers[0]) {
            this.ctx.onError((0, errors_1.getError)('UNEXPECTED_INTERNAL_ERROR', new Error('No browsers found, cannot set a browser')));
            return;
        }
        const browser = ((prefs === null || prefs === void 0 ? void 0 : prefs.lastBrowser) && browsers.find((b) => {
            return b.name === prefs.lastBrowser.name && b.channel === prefs.lastBrowser.channel;
        })) || browsers[0];
        this.ctx.actions.browser.setActiveBrowser(browser);
    }
    async setActiveBrowserByNameOrPath(nameOrPath) {
        try {
            const browser = await this.ctx._apis.browserApi.ensureAndGetByNameOrPath(nameOrPath);
            this.ctx.debug('browser found to set', browser.name);
            this.ctx.actions.browser.setActiveBrowser(browser);
        }
        catch (e) {
            const error = e;
            this.ctx.onWarning(error);
        }
    }
    async refreshLifecycle() {
        var _a;
        if (!this._projectRoot || !this._configManager || !this.readyToInitialize(this._projectRoot)) {
            return;
        }
        // Make sure remote states in the server are reset when the project is reloaded.
        // TODO: maybe we should also reset the server state here as well?
        (_a = this.ctx._apis.projectApi.getRemoteStates()) === null || _a === void 0 ? void 0 : _a.reset();
        this._configManager.resetLoadingState();
        // Emit here so that the user gets the impression that we're loading rather than waiting for a full refresh of the config for an update
        this.ctx.emitter.toLaunchpad();
        this.ctx.emitter.toApp();
        await this.initializeConfig();
        if (this._currentTestingType && this.isTestingTypeConfigured(this._currentTestingType)) {
            if (this._currentTestingType === 'component') {
                // Since we refresh the dev-server on config changes, we need to close it and clean up it's listeners
                // before we can start a new one. This needs to happen before we have registered the events of the child process
                this.ctx._apis.projectApi.getDevServer().close();
            }
            this._configManager.loadTestingType();
        }
        else {
            this.setAndLoadCurrentTestingType(null);
        }
    }
    async waitForInitializeSuccess() {
        var _a, _b;
        if (!this._configManager) {
            return false;
        }
        if ((_a = this._configManager) === null || _a === void 0 ? void 0 : _a.isLoadingConfigFile) {
            const span = telemetry_1.telemetry.startSpan({ name: `dataContext:loadConfig` });
            try {
                await this.initializeConfig();
                return true;
            }
            catch (error) {
                this.ctx.debug('error thrown by initializeConfig', error);
                return false;
            }
            finally {
                span === null || span === void 0 ? void 0 : span.end();
            }
        }
        return !((_b = this._configManager) === null || _b === void 0 ? void 0 : _b.isInError);
    }
    async initializeConfig() {
        (0, assert_1.default)(this._configManager, 'Cannot initialize config without a config manager');
        return this._configManager.initializeConfig();
    }
    _setCurrentProject(projectRoot) {
        process.chdir(projectRoot);
        this._projectRoot = projectRoot;
        this._initializedProject = undefined;
        this._configManager = this.createConfigManager();
        // Preemptively load these so that they are available when we need them later
        this.ctx.browser.machineBrowsers().catch(this.onLoadError);
        const packageManagerUsed = this.getPackageManagerUsed(projectRoot);
        this.ctx.update((s) => {
            var _a, _b;
            s.currentProject = projectRoot;
            (_a = s.currentProjectGitInfo) === null || _a === void 0 ? void 0 : _a.destroy();
            s.currentProjectGitInfo = new sources_1.GitDataSource({
                isRunMode: this.ctx.isRunMode,
                projectRoot,
                onError: this.ctx.onError,
                onBranchChange: () => {
                    this.ctx.emitter.branchChange();
                },
                onGitInfoChange: (specPaths) => {
                    this.ctx.emitter.gitInfoChange(specPaths);
                },
                onGitLogChange: async (shas) => {
                    await this.ctx.relevantRuns.checkRelevantRuns(shas);
                },
            });
            (_b = s.eventCollectorSource) === null || _b === void 0 ? void 0 : _b.destroy();
            if (this.ctx.isOpenMode) {
                s.eventCollectorSource = new sources_1.EventCollectorSource(this.ctx);
            }
            s.diagnostics = { error: null, warnings: [] };
            s.packageManager = packageManagerUsed;
        });
        this.verifyProjectRoot(projectRoot);
        if (this.readyToInitialize(this._projectRoot)) {
            this._configManager.initializeConfig().catch(this.onLoadError);
        }
    }
    /**
     * When we set the current project, we need to cleanup the
     * previous project that might have existed. We use this as the
     * single location we should use to set the `projectRoot`, because
     * we can call it from legacy code and it'll be a no-op if the `projectRoot`
     * is already the same, otherwise it'll do the necessary cleanup
     */
    async setCurrentProject(projectRoot) {
        if (this._projectRoot === projectRoot) {
            return;
        }
        await this.resetInternalState();
        this._setCurrentProject(projectRoot);
    }
    /**
     * Handles pre-initialization checks. These will display warnings or throw with errors if catastrophic.
     * Returns false, if we're not ready to initialize due to needing to migrate
     *
     * @param projectRoot the project's root
     * @returns true if we can initialize and false if not
     */
    readyToInitialize(projectRoot) {
        const { needsCypressJsonMigration } = this.refreshMetaState();
        const legacyConfigPath = path_1.default.join(projectRoot, this.ctx.migration.legacyConfigFile);
        if (needsCypressJsonMigration && !this.ctx.isRunMode && this.ctx.fs.existsSync(legacyConfigPath)) {
            return false;
        }
        this.legacyPluginGuard();
        this.configFileWarningCheck();
        return this.metaState.hasValidConfigFile;
    }
    async legacyMigration() {
        try {
            const legacyConfigPath = path_1.default.join(this.projectRoot, this.ctx.migration.legacyConfigFile);
            // we run the legacy plugins/index.js in a child process
            // and mutate the config based on the return value for migration
            // only used in open mode (cannot migrate via terminal)
            const legacyConfig = await this.ctx.fs.readJson(legacyConfigPath);
            // should never throw, unless there existing pluginsFile errors out,
            // in which case they are attempting to migrate an already broken project.
            await this.ctx.actions.migration.initialize(legacyConfig);
        }
        catch (error) {
            this.onLoadError(error);
        }
    }
    get runModeExitEarly() {
        return this._runModeExitEarly;
    }
    set runModeExitEarly(val) {
        this._runModeExitEarly = val;
    }
    /**
     * Sets, but doesn't load the current testing type. This is useful
     * for tests when we don't want to kick off node events
     */
    setCurrentTestingType(testingType) {
        this.ctx.update((d) => {
            d.currentTestingType = testingType;
            d.wizard.chosenBundler = null;
            d.wizard.chosenFramework = null;
            if (testingType) {
                d.diagnostics = {
                    error: null,
                    warnings: [],
                };
            }
        });
        this._currentTestingType = testingType;
        (0, assert_1.default)(this._configManager, 'Cannot set a testing type without a config manager');
        this._configManager.setTestingType(testingType);
    }
    /**
     * Setting the testing type should automatically handle cleanup of existing
     * processes and load the config / initialize the plugin process associated
     * with the chosen testing type.
     */
    setAndLoadCurrentTestingType(testingType) {
        this.ctx.update((d) => {
            d.currentTestingType = testingType;
            d.wizard.chosenBundler = null;
            d.wizard.chosenFramework = null;
        });
        if (this._currentTestingType === testingType) {
            return;
        }
        this._initializedProject = undefined;
        this._currentTestingType = testingType;
        (0, assert_1.default)(this._configManager, 'Cannot set a testing type without a config manager');
        this._configManager.setTestingType(testingType);
        if (!testingType) {
            return;
        }
        if (this.ctx.isRunMode && this.loadedConfigFile && !this.isTestingTypeConfigured(testingType)) {
            return this.ctx.onError((0, errors_1.getError)('TESTING_TYPE_NOT_CONFIGURED', testingType));
        }
        if (this.ctx.isRunMode || (this.isTestingTypeConfigured(testingType) && !(this.ctx.coreData.forceReconfigureProject && this.ctx.coreData.forceReconfigureProject[testingType]))) {
            this._configManager.loadTestingType();
        }
    }
    async resetInternalState() {
        var _a, _b;
        if (this._configManager) {
            await this._configManager.destroy();
            this._configManager = undefined;
        }
        await ((_a = this.ctx.coreData.currentProjectGitInfo) === null || _a === void 0 ? void 0 : _a.destroy());
        await this.ctx.project.destroy();
        await ((_b = this.ctx.coreData.eventCollectorSource) === null || _b === void 0 ? void 0 : _b.destroy());
        this._currentTestingType = null;
        this._cachedInitialConfig = undefined;
        this._cachedFullConfig = undefined;
    }
    /**
     * Equivalent to the legacy "config.get()",
     * this sources the config from the various config sources
     */
    async getFullInitialConfig(options = this.ctx.modeOptions, withBrowsers = true) {
        (0, assert_1.default)(this._configManager, 'Cannot get full config without a config manager');
        return this._configManager.getFullInitialConfig(options, withBrowsers);
    }
    async getConfigFileContents() {
        (0, assert_1.default)(this._configManager, 'Cannot get config file contents without a config manager');
        return this._configManager.getConfigFileContents();
    }
    async reinitializeCypress() {
        (0, pluginHandlers_1.resetPluginHandlers)();
        await this.resetInternalState();
    }
    registerEvent(event, callback) {
        return this._eventRegistrar.registerEvent(event, callback);
    }
    hasNodeEvent(eventName) {
        return this._eventRegistrar.hasNodeEvent(eventName);
    }
    executeNodeEvent(event, args) {
        return this._eventRegistrar.executeNodeEvent(event, args);
    }
    legacyPluginGuard() {
        // test and warn for incompatible plugin
        try {
            const retriesPluginPath = path_1.default.dirname(resolve_1.default.sync('cypress-plugin-retries/package.json', {
                basedir: this.projectRoot,
            }));
            this.ctx.onWarning((0, errors_1.getError)('INCOMPATIBLE_PLUGIN_RETRIES', path_1.default.relative(this.projectRoot, retriesPluginPath)));
        }
        catch (e) {
            // noop, incompatible plugin not installed
        }
    }
    /**
     * Find all information about the project we need to know to prompt different
     * onboarding screens, suggestions in the onboarding wizard, etc.
     */
    refreshMetaState() {
        const configFile = this.ctx.modeOptions.configFile;
        const metaState = {
            ...PROJECT_META_STATE,
            hasLegacyCypressJson: this.ctx.migration.legacyConfigFileExists(),
            hasCypressEnvFile: fs_1.default.existsSync(this._pathToFile('cypress.env.json')),
        };
        try {
            // TODO: convert to async FS method
            // eslint-disable-next-line no-restricted-syntax
            const pkgJson = this.ctx.fs.readJsonSync(this._pathToFile('package.json'));
            if (pkgJson.type === 'module') {
                metaState.isProjectUsingESModules = true;
            }
            metaState.isUsingTypeScript = (0, scaffold_config_1.detectLanguage)({
                projectRoot: this.projectRoot,
                customConfigFile: configFile,
                pkgJson,
                isMigrating: metaState.hasLegacyCypressJson,
            }) === 'ts';
        }
        catch (_a) {
            // No need to handle
        }
        if (configFile) {
            metaState.hasSpecifiedConfigViaCLI = this._pathToFile(configFile);
            if (configFile.endsWith('.json')) {
                metaState.needsCypressJsonMigration = true;
                const configFileNameAfterMigration = configFile.replace('.json', `.config.${metaState.isUsingTypeScript ? 'ts' : 'js'}`);
                if (this.ctx.fs.existsSync(this._pathToFile(configFileNameAfterMigration))) {
                    if (this.ctx.fs.existsSync(this._pathToFile(configFile))) {
                        this.ctx.onError((0, errors_1.getError)('LEGACY_CONFIG_FILE', configFileNameAfterMigration, this.projectRoot, configFile));
                    }
                    else {
                        this.ctx.onError((0, errors_1.getError)('MIGRATION_ALREADY_OCURRED', configFileNameAfterMigration, configFile));
                    }
                }
            }
            else {
                this.setConfigFilePath(configFile);
                if (fs_1.default.existsSync(this.configFilePath)) {
                    metaState.hasValidConfigFile = true;
                }
            }
            this._projectMetaState = metaState;
            return metaState;
        }
        let configFilePathSet = false;
        metaState.allFoundConfigFiles = [];
        for (const fileName of POTENTIAL_CONFIG_FILES) {
            const filePath = this._pathToFile(fileName);
            const fileExists = fs_1.default.existsSync(filePath);
            if (fileExists) {
                // We'll collect all the found config files.
                // If we found more than one, this list will be used in an error message.
                metaState.allFoundConfigFiles.push(fileName);
                // We've found our first config file! We'll continue looping to make sure there's
                // only one. Looping over all config files is done so we can provide rich errors and warnings.
                if (!configFilePathSet) {
                    metaState.hasValidConfigFile = true;
                    this.setConfigFilePath(fileName);
                    configFilePathSet = true;
                }
            }
        }
        // We finished looping through all of the possible config files
        // And we *still* didn't find anything. Set the configFilePath to JS or TS.
        if (!configFilePathSet) {
            this.setConfigFilePath(`cypress.config.${metaState.isUsingTypeScript ? 'ts' : 'js'}`);
            configFilePathSet = true;
        }
        if (metaState.hasLegacyCypressJson && !metaState.hasValidConfigFile) {
            metaState.needsCypressJsonMigration = true;
        }
        this._projectMetaState = metaState;
        return metaState;
    }
    _pathToFile(file) {
        return path_1.default.isAbsolute(file) ? file : path_1.default.join(this.projectRoot, file);
    }
    verifyProjectRoot(root) {
        try {
            // TODO: convert to async fs call
            // eslint-disable-next-line no-restricted-syntax
            if (!fs_1.default.statSync(root).isDirectory()) {
                throw new Error('NOT DIRECTORY');
            }
        }
        catch (err) {
            throw (0, errors_1.getError)('NO_PROJECT_FOUND_AT_PROJECT_ROOT', this.projectRoot);
        }
    }
    async destroy() {
        await this.resetInternalState();
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
    async initializeOpenMode(testingType) {
        if (this._projectRoot && testingType && await this.waitForInitializeSuccess()) {
            this.setAndLoadCurrentTestingType(testingType);
            await this.initializeProjectSetup(testingType);
        }
    }
    /**
     * Prepare the setup process for a project if one exists, otherwise complete setup
     *
     * @param testingType
     * @returns
     */
    async initializeProjectSetup(testingType) {
        if (this.isTestingTypeConfigured(testingType)) {
            return;
        }
        if (testingType === 'e2e' && !this.ctx.migration.needsCypressJsonMigration()) {
            // E2E doesn't have a wizard, so if we have a testing type on load we just create/update their cypress.config.js.
            await this.ctx.actions.wizard.scaffoldTestingType();
        }
        else if (testingType === 'component') {
            await this.ctx.actions.wizard.detectFrameworks();
            await this.ctx.actions.wizard.initialize();
        }
    }
    async initializeRunMode(testingType) {
        this._pendingInitialize = (0, p_defer_1.default)();
        if (await this.waitForInitializeSuccess()) {
            if (!this.metaState.hasValidConfigFile) {
                return this.ctx.onError((0, errors_1.getError)('NO_DEFAULT_CONFIG_FILE_FOUND', this.projectRoot));
            }
            const span = telemetry_1.telemetry.startSpan({ name: 'dataContext:setAndLoadCurrentTestingType' });
            span === null || span === void 0 ? void 0 : span.setAttributes({ testingType: testingType ? testingType : 'undefined' });
            if (testingType) {
                this.setAndLoadCurrentTestingType(testingType);
            }
            else {
                this.setAndLoadCurrentTestingType('e2e');
            }
        }
        return this._pendingInitialize.promise.finally(() => {
            var _a;
            (_a = telemetry_1.telemetry.getSpan('dataContext:setAndLoadCurrentTestingType')) === null || _a === void 0 ? void 0 : _a.end();
            this._pendingInitialize = undefined;
        });
    }
    configFileWarningCheck() {
        // Only if they've explicitly specified a config file path do we error, otherwise they'll go through onboarding
        if (!this.metaState.hasValidConfigFile && this.metaState.hasSpecifiedConfigViaCLI !== false && this.ctx.isRunMode) {
            this.onLoadError((0, errors_1.getError)('CONFIG_FILE_NOT_FOUND', path_1.default.basename(this.metaState.hasSpecifiedConfigViaCLI), path_1.default.dirname(this.metaState.hasSpecifiedConfigViaCLI)));
        }
        if (this.metaState.hasLegacyCypressJson && !this.metaState.hasValidConfigFile && this.ctx.isRunMode) {
            this.onLoadError((0, errors_1.getError)('CONFIG_FILE_MIGRATION_NEEDED', this.projectRoot));
        }
        if (this.metaState.allFoundConfigFiles.length > 1) {
            this.onLoadError((0, errors_1.getError)('CONFIG_FILES_LANGUAGE_CONFLICT', this.projectRoot, this.metaState.allFoundConfigFiles));
        }
        if (this.metaState.hasValidConfigFile && this.metaState.hasLegacyCypressJson) {
            this.onLoadError((0, errors_1.getError)('LEGACY_CONFIG_FILE', path_1.default.basename(this.configFilePath), this.projectRoot));
        }
    }
    mainProcessWillDisconnect() {
        if (!this._configManager) {
            return Promise.resolve();
        }
        return this._configManager.mainProcessWillDisconnect();
    }
}
exports.ProjectLifecycleManager = ProjectLifecycleManager;
