"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectActions = exports.RunSpecError = void 0;
const tslib_1 = require("tslib");
const types_1 = require(process.argv[1]+"/../packages/types");
const execa_1 = tslib_1.__importDefault(require("execa"));
const path_1 = tslib_1.__importDefault(require("path"));
const assert_1 = tslib_1.__importDefault(require("assert"));
const codegen_1 = require("../codegen");
const templates_1 = tslib_1.__importDefault(require("../codegen/templates"));
const util_1 = require("../util");
const errors_1 = require(process.argv[1]+"/../packages/errors");
const config_1 = require(process.argv[1]+"/../packages/config");
const debug_1 = tslib_1.__importDefault(require("debug"));
class RunSpecError extends Error {
    constructor(code, msg) {
        super(msg);
        this.code = code;
    }
}
exports.RunSpecError = RunSpecError;
const debug = (0, debug_1.default)('cypress:data-context:ProjectActions');
class ProjectActions {
    constructor(ctx) {
        this.ctx = ctx;
    }
    get api() {
        return this.ctx._apis.projectApi;
    }
    async clearCurrentProject() {
        // Clear data associated with local project
        this.ctx.update((d) => {
            d.activeBrowser = null;
            d.currentProject = null;
            d.diagnostics = {
                error: null,
                warnings: [],
            };
            d.currentTestingType = null;
            d.forceReconfigureProject = null;
            d.scaffoldedFiles = null;
            d.app.browserStatus = 'closed';
            d.app.browserUserAgent = null;
        });
        // Also clear any data associated with the linked cloud project
        this.ctx.actions.cloudProject.clearCloudProject();
        this.ctx.actions.migration.reset();
        await this.ctx.lifecycleManager.clearCurrentProject();
        (0, config_1.resetIssuedWarnings)();
        await this.api.closeActiveProject();
    }
    set projects(projects) {
        this.ctx.update((d) => {
            d.app.projects = projects;
        });
    }
    openDirectoryInIDE(projectPath) {
        this.ctx.debug(`opening ${projectPath} in ${this.ctx.coreData.localSettings.preferences.preferredEditorBinary}`);
        if (!this.ctx.coreData.localSettings.preferences.preferredEditorBinary) {
            return;
        }
        if (this.ctx.coreData.localSettings.preferences.preferredEditorBinary === 'computer') {
            this.ctx.actions.electron.showItemInFolder(projectPath);
        }
        (0, execa_1.default)(this.ctx.coreData.localSettings.preferences.preferredEditorBinary, [projectPath]);
    }
    setAndLoadCurrentTestingType(type) {
        this.ctx.lifecycleManager.setAndLoadCurrentTestingType(type);
    }
    async initializeProjectSetup(type) {
        await this.ctx.lifecycleManager.initializeProjectSetup(type);
    }
    async setCurrentProject(projectRoot) {
        await this.updateProjectList(() => this.api.insertProjectToCache(projectRoot));
        await this.clearCurrentProject();
        await this.ctx.lifecycleManager.setCurrentProject(projectRoot);
    }
    // Temporary: remove after other refactor lands
    async setCurrentProjectAndTestingTypeForTestSetup(projectRoot) {
        await this.ctx.lifecycleManager.clearCurrentProject();
        await this.ctx.lifecycleManager.setCurrentProject(projectRoot);
        this.ctx.lifecycleManager.setCurrentTestingType('e2e');
        // @ts-expect-error - we are setting this as a convenience for our integration tests
        this.ctx._modeOptions = {};
    }
    async loadProjects() {
        const projectRoots = await this.api.getProjectRootsFromCache();
        return this.projects = [...projectRoots];
    }
    async initializeActiveProject(options = {}) {
        (0, assert_1.default)(this.ctx.currentProject, 'Cannot initialize project without an active project');
        (0, assert_1.default)(this.ctx.coreData.currentTestingType, 'Cannot initialize project without choosing testingType');
        const allModeOptionsWithLatest = {
            ...this.ctx.modeOptions,
            projectRoot: this.ctx.currentProject,
            testingType: this.ctx.coreData.currentTestingType,
        };
        try {
            await this.api.closeActiveProject();
            return await this.api.openProjectCreate(allModeOptionsWithLatest, {
                ...options,
                ctx: this.ctx,
            }).finally(async () => {
                // When switching testing type, the project should be relaunched in the previously selected browser
                if (this.ctx.coreData.app.relaunchBrowser) {
                    this.ctx.project.setRelaunchBrowser(false);
                    await this.ctx.actions.project.launchProject(this.ctx.coreData.currentTestingType);
                }
            });
        }
        catch (e) {
            // TODO(tim): remove / replace with ctx.log.error
            // eslint-disable-next-line
            console.error(e);
            throw e;
        }
    }
    async updateProjectList(updater) {
        return updater().then(() => this.loadProjects());
    }
    async addProjectFromElectronNativeFolderSelect() {
        const path = await this.ctx.actions.electron.showOpenDialog();
        if (!path) {
            return;
        }
        await this.addProject({ path, open: true });
        this.ctx.emitter.toLaunchpad();
    }
    async addProject(args) {
        const projectRoot = await this.getDirectoryPath(args.path);
        if (args.open) {
            this.setCurrentProject(projectRoot).catch(this.ctx.onError);
        }
        else {
            await this.updateProjectList(() => this.api.insertProjectToCache(projectRoot));
        }
    }
    async getDirectoryPath(projectRoot) {
        try {
            const { dir, base } = path_1.default.parse(projectRoot);
            const fullPath = path_1.default.join(dir, base);
            const dirStat = await this.ctx.fs.stat(fullPath);
            if (dirStat.isDirectory()) {
                return fullPath;
            }
            return dir;
        }
        catch (exception) {
            throw Error(`Cannot add ${projectRoot} to projects as it does not exist in the file system`);
        }
    }
    async launchProject(testingType, options, specPath) {
        if (!this.ctx.currentProject) {
            return null;
        }
        testingType = testingType || this.ctx.coreData.currentTestingType;
        // It's strange to have no testingType here, but `launchProject` is called when switching testing types,
        // so it needs to short-circuit and return here.
        // TODO: Untangle this. https://cypress-io.atlassian.net/browse/UNIFY-1528
        if (!testingType)
            return;
        this.ctx.coreData.currentTestingType = testingType;
        const browser = this.ctx.coreData.activeBrowser;
        if (!browser)
            throw new Error('Missing browser in launchProject');
        let activeSpec;
        if (specPath) {
            activeSpec = specPath === types_1.RUN_ALL_SPECS_KEY ? types_1.RUN_ALL_SPECS : this.ctx.project.getCurrentSpecByAbsolute(specPath);
        }
        // launchProject expects a spec when opening browser for url navigation.
        // We give it an template spec if none is passed so as to land on home page
        const emptySpec = {
            name: '',
            absolute: '',
            relative: '',
            specType: testingType === 'e2e' ? 'integration' : 'component',
        };
        // Used for run-all-specs feature
        if (options === null || options === void 0 ? void 0 : options.shouldLaunchNewTab) {
            await this.api.resetBrowserTabsForNextTest(true);
            this.api.resetServer();
        }
        await this.api.launchProject(browser, activeSpec !== null && activeSpec !== void 0 ? activeSpec : emptySpec, options);
        return;
    }
    removeProject(projectRoot) {
        return this.updateProjectList(() => this.api.removeProjectFromCache(projectRoot));
    }
    async createConfigFile(type) {
        const project = this.ctx.currentProject;
        if (!project) {
            throw Error(`Cannot create config file without currentProject.`);
        }
        let obj = {
            e2e: {},
            component: {},
        };
        if (type) {
            obj = {
                [type]: {},
            };
        }
        await this.ctx.fs.writeFile(this.ctx.lifecycleManager.configFilePath, `module.exports = ${JSON.stringify(obj, null, 2)}`);
    }
    async setProjectIdInConfigFile(projectId) {
        return (0, util_1.insertValuesInConfigFile)(this.ctx.lifecycleManager.configFilePath, { projectId }, { get(id) {
                return Error(id);
            } });
    }
    async clearLatestProjectCache() {
        await this.api.clearLatestProjectsCache();
    }
    async clearProjectPreferencesCache(projectTitle) {
        await this.api.clearProjectPreferences(projectTitle);
    }
    async clearAllProjectPreferencesCache() {
        await this.api.clearAllProjectPreferences();
    }
    setPromptShown(slug) {
        this.api.setPromptShown(slug);
    }
    setSpecs(specs) {
        this.ctx.project.setSpecs(specs);
        this.refreshSpecs(specs);
        // only check for non-example specs when the specs change
        this.hasNonExampleSpec().then((result) => {
            this.ctx.project.setHasNonExampleSpec(result);
        })
            .catch((e) => {
            this.ctx.project.setHasNonExampleSpec(false);
            this.ctx.logTraceError(e);
        });
        if (this.ctx.coreData.currentTestingType === 'component') {
            this.api.getDevServer().updateSpecs(specs);
        }
        this.ctx.emitter.specsChange();
    }
    refreshSpecs(specs) {
        var _a;
        (_a = this.ctx.lifecycleManager.git) === null || _a === void 0 ? void 0 : _a.setSpecs(specs.map((s) => s.absolute));
    }
    setProjectPreferencesInGlobalCache(args) {
        if (!this.ctx.currentProject) {
            throw Error(`Cannot save preferences without currentProject.`);
        }
        this.api.insertProjectPreferencesToCache(this.ctx.lifecycleManager.projectTitle, args);
    }
    async setSpecsFoundBySpecPattern({ projectRoot, testingType, specPattern, configSpecPattern, excludeSpecPattern, additionalIgnorePattern }) {
        const toArray = (val) => val ? typeof val === 'string' ? [val] : val : [];
        configSpecPattern = toArray(configSpecPattern);
        specPattern = toArray(specPattern);
        excludeSpecPattern = toArray(excludeSpecPattern) || [];
        // exclude all specs matching e2e if in component testing
        additionalIgnorePattern = toArray(additionalIgnorePattern) || [];
        if (!specPattern || !configSpecPattern) {
            throw Error('could not find pattern to load specs');
        }
        const specs = await this.ctx.project.findSpecs({
            projectRoot,
            testingType,
            specPattern,
            configSpecPattern,
            excludeSpecPattern,
            additionalIgnorePattern,
        });
        this.ctx.actions.project.setSpecs(specs);
        await this.ctx.project.startSpecWatcher({
            projectRoot,
            testingType,
            specPattern,
            configSpecPattern,
            excludeSpecPattern,
            additionalIgnorePattern,
        });
    }
    setForceReconfigureProjectByTestingType({ forceReconfigureProject, testingType }) {
        const testingTypeToReconfigure = testingType !== null && testingType !== void 0 ? testingType : this.ctx.coreData.currentTestingType;
        if (!testingTypeToReconfigure) {
            return;
        }
        this.ctx.update((coreData) => {
            coreData.forceReconfigureProject = {
                ...coreData.forceReconfigureProject,
                [testingTypeToReconfigure]: forceReconfigureProject,
            };
        });
    }
    async reconfigureProject() {
        await this.ctx.actions.browser.closeBrowser();
        this.ctx.actions.wizard.resetWizard();
        await this.ctx.actions.wizard.initialize();
        this.ctx.actions.electron.refreshBrowserWindow();
        this.ctx.actions.electron.showBrowserWindow();
    }
    async hasNonExampleSpec() {
        var _a;
        const specs = (_a = this.ctx.project.specs) === null || _a === void 0 ? void 0 : _a.map((spec) => spec.relativeToCommonRoot);
        switch (this.ctx.coreData.currentTestingType) {
            case 'e2e':
                return (0, codegen_1.hasNonExampleSpec)(templates_1.default.e2eExamples, specs);
            case 'component':
                return specs.length > 0;
            case null:
                return false;
            default:
                throw new Error(`Unsupported testing type ${this.ctx.coreData.currentTestingType}`);
        }
    }
    async pingBaseUrl() {
        var _a;
        const baseUrl = (_a = (await this.ctx.project.getConfig())) === null || _a === void 0 ? void 0 : _a.baseUrl;
        // Should never happen
        if (!baseUrl) {
            return;
        }
        const baseUrlWarning = this.ctx.coreData.diagnostics.warnings.find((e) => e.cypressError.type === 'CANNOT_CONNECT_BASE_URL_WARNING');
        if (baseUrlWarning) {
            this.ctx.actions.error.clearWarning(baseUrlWarning.id);
            this.ctx.emitter.errorWarningChange();
        }
        return this.api.isListening(baseUrl)
            .catch(() => this.ctx.onWarning((0, errors_1.getError)('CANNOT_CONNECT_BASE_URL_WARNING', baseUrl)));
    }
    async switchTestingTypesAndRelaunch(testingType) {
        const isTestingTypeConfigured = this.ctx.lifecycleManager.isTestingTypeConfigured(testingType);
        this.ctx.project.setRelaunchBrowser(isTestingTypeConfigured);
        this.setAndLoadCurrentTestingType(testingType);
        await this.reconfigureProject();
        if (testingType === 'e2e' && !isTestingTypeConfigured) {
            // E2E doesn't have a wizard, so if we have a testing type on load we just create/update their cypress.config.js.
            await this.ctx.actions.wizard.scaffoldTestingType();
        }
    }
    async runSpec({ specPath }) {
        const waitForBrowserToOpen = async () => {
            const browserStatusSubscription = this.ctx.emitter.subscribeTo('browserStatusChange', { sendInitial: false });
            // Wait for browser to finish launching. Browser is either launched from scratch
            // or relaunched when switching testing types - we need to wait in either case
            // We wait a maximum of 3 seconds so we don't block indefinitely in case something
            // goes sideways with the browser launch process. This is broken up into three
            // separate 'waits' in case we have to watch a browser relaunch (close > opening > open)
            debug('Waiting for browser to report `open`');
            let maxIterations = 3;
            while (this.ctx.coreData.app.browserStatus !== 'open') {
                await Promise.race([
                    new Promise((resolve) => setTimeout(resolve, 1000)),
                    browserStatusSubscription.next(),
                ]);
                if (--maxIterations === 0) {
                    break;
                }
            }
            await browserStatusSubscription.return(undefined);
        };
        try {
            if (!this.ctx.currentProject) {
                throw new RunSpecError('NO_PROJECT', 'A project must be open prior to attempting to run a spec');
            }
            if (!specPath) {
                throw new RunSpecError('NO_SPEC_PATH', '`specPath` must be a non-empty string');
            }
            let targetTestingType;
            // Get relative path from the specPath to determine which testing type from the specPattern
            const relativeSpecPath = path_1.default.relative(this.ctx.currentProject, specPath);
            // Check to see whether input specPath matches the specPattern for one or the other testing type
            // If it matches neither then we can't run the spec and we should error
            if (await this.ctx.project.matchesSpecPattern(relativeSpecPath, 'e2e')) {
                targetTestingType = 'e2e';
            }
            else if (await this.ctx.project.matchesSpecPattern(relativeSpecPath, 'component')) {
                targetTestingType = 'component';
            }
            else {
                throw new RunSpecError('NO_SPEC_PATTERN_MATCH', 'Unable to determine testing type, spec does not match any configured specPattern');
            }
            debug(`Spec %s matches '${targetTestingType}' pattern`, specPath);
            debug('Attempting to launch spec %s', specPath);
            // Look to see if there's actually a file at the target location
            // This helps us avoid switching testingType *then* finding out the spec doesn't exist
            if (!this.ctx.fs.existsSync(specPath)) {
                throw new RunSpecError('SPEC_NOT_FOUND', `No file exists at path ${specPath}`);
            }
            // We now know what testingType we need to be in - if we're already there, great
            // If not, verify that type is configured then switch (or throw an error if not configured)
            if (this.ctx.coreData.currentTestingType !== targetTestingType) {
                if (!this.ctx.lifecycleManager.isTestingTypeConfigured(targetTestingType)) {
                    throw new RunSpecError('TESTING_TYPE_NOT_CONFIGURED', `Input path matched specPattern for '${targetTestingType}' testing type, but it is not configured.`);
                }
                debug('Setting testing type to %s', targetTestingType);
                const specChangeSubscription = this.ctx.emitter.subscribeTo('specsChange', { sendInitial: false });
                const originalTestingType = this.ctx.coreData.currentTestingType;
                // Temporarily toggle testing type so the `activeBrowser` can be initialized
                // for the targeted testing type. Browser has to be initialized prior to our "relaunch"
                // call below - this can be an issue when Cypress is still on the launchpad and no
                // browser has been launched yet
                this.ctx.lifecycleManager.setCurrentTestingType(targetTestingType);
                await this.ctx.lifecycleManager.setInitialActiveBrowser();
                this.ctx.lifecycleManager.setCurrentTestingType(originalTestingType);
                // This is the magic sauce - we now have a browser selected, so this will toggle
                // the testing type, trigger specs to update, and launch the browser
                await this.switchTestingTypesAndRelaunch(targetTestingType);
                await waitForBrowserToOpen();
                // When testing type changes we need to wait for the specWatcher to trigger and load new specs
                // otherwise our call to `getCurrentSpecByAbsolute` below will fail
                // Wait a maximum of 2 seconds just in case something breaks with the event subscription
                // so we don't block indefinitely
                debug('Waiting for specs to finish loading');
                await Promise.race([
                    new Promise((resolve) => setTimeout(resolve, 2000)),
                    specChangeSubscription.next(),
                ]);
                // Close out subscription
                await specChangeSubscription.return(undefined);
            }
            else {
                debug('Already in %s testing mode', targetTestingType);
            }
            // This accounts for an edge case where a testing type has been previously opened, but
            // the user then backs out to the testing type selector in launchpad. In that scenario,
            // the testingType switch logic above does not trigger the browser to open, so we do it
            // manually here
            if (this.ctx.coreData.app.browserStatus === 'closed') {
                debug('No browser instance, launching...');
                await this.ctx.lifecycleManager.setInitialActiveBrowser();
                await this.api.launchProject(this.ctx.coreData.activeBrowser, {
                    name: '',
                    absolute: '',
                    relative: '',
                    specType: targetTestingType === 'e2e' ? 'integration' : 'component',
                });
                debug('Browser launched');
            }
            else {
                debug(`Browser already running, status ${this.ctx.coreData.app.browserStatus}`);
                if (this.ctx.coreData.app.browserStatus !== 'open') {
                    await waitForBrowserToOpen();
                }
            }
            // Now that we're in the correct testingType, verify the requested spec actually exists
            // We don't have specs available until a testingType is loaded, so even through we validated
            // a matching file exists above it may not end up loading as a valid spec so we validate that here
            //
            // Have to use toPosix here to align windows absolute paths with how the absolute path is storied in the data context
            const spec = this.ctx.project.getCurrentSpecByAbsolute((0, util_1.toPosix)(specPath));
            if (!spec) {
                debug(`Spec not found with path: ${specPath}`);
                throw new RunSpecError('SPEC_NOT_FOUND', `Unable to find matching spec with path ${specPath}`);
            }
            const browser = this.ctx.coreData.activeBrowser;
            // Hooray, everything looks good and we're all set up
            // Try to launch the requested spec by navigating to it in the browser
            await this.api.runSpec(spec);
            return {
                testingType: targetTestingType,
                browser,
                spec,
            };
        }
        catch (err) {
            if (!(err instanceof RunSpecError)) {
                debug('Unexpected error during `runSpec` %o', err);
            }
            return {
                code: err instanceof RunSpecError ? err.code : 'GENERAL_ERROR',
                detailMessage: err.message,
            };
        }
    }
    async debugCloudRun(runNumber) {
        var _a;
        debug('attempting to switch to run #%s', runNumber);
        await this.ctx.relevantRuns.moveToRun(runNumber, ((_a = this.ctx.git) === null || _a === void 0 ? void 0 : _a.currentHashes) || []);
        debug('navigating to Debug page');
        this.api.routeToDebug(runNumber);
    }
}
exports.ProjectActions = ProjectActions;
