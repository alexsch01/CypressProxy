"use strict";
var _a, _DataContext_activeRequestCount, _DataContext_awaitingEmptyRequestCount;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataContext = void 0;
const tslib_1 = require("tslib");
const fs_extra_1 = tslib_1.__importDefault(require("fs-extra"));
const path_1 = tslib_1.__importDefault(require("path"));
const chalk_1 = tslib_1.__importDefault(require("chalk"));
const assert_1 = tslib_1.__importDefault(require("assert"));
const underscore_string_1 = tslib_1.__importDefault(require("underscore.string"));
const lodash_1 = tslib_1.__importDefault(require("lodash"));
require("server-destroy");
const actions_1 = require("./actions");
const debug_1 = tslib_1.__importDefault(require("debug"));
const coreDataShape_1 = require("./data/coreDataShape");
const DataActions_1 = require("./DataActions");
const sources_1 = require("./sources");
const cached_1 = require("./util/cached");
const _1 = require(".");
const ProjectLifecycleManager_1 = require("./data/ProjectLifecycleManager");
const config_1 = require(process.argv[1]+"/../packages/config");
const IS_DEV_ENV = process.env.CYPRESS_INTERNAL_ENV !== 'production';
class DataContext {
    constructor(_config) {
        var _b;
        /**
         * This will be replaced with Immer, for immutable state updates.
         */
        this.update = (updater) => {
            updater(this._coreData);
        };
        this.debug = (0, debug_1.default)('cypress:data-context');
        this._debugCache = {};
        this.debugNs = (ns, evt, ...args) => {
            var _b;
            var _c;
            const _debug = (_b = (_c = this._debugCache)[ns]) !== null && _b !== void 0 ? _b : (_c[ns] = (0, debug_1.default)(`cypress:data-context:${ns}`));
            _debug(evt, ...args);
        };
        this.onError = (cypressError, title = 'Unexpected Error') => {
            var _b;
            if (this.isRunMode) {
                if ((_b = this.lifecycleManager) === null || _b === void 0 ? void 0 : _b.runModeExitEarly) {
                    this.lifecycleManager.runModeExitEarly(cypressError);
                }
                else {
                    throw cypressError;
                }
            }
            else {
                const err = {
                    id: lodash_1.default.uniqueId('Error'),
                    title,
                    cypressError,
                };
                this.update((d) => {
                    if (d.diagnostics) {
                        d.diagnostics.error = err;
                    }
                });
                this.emitter.errorWarningChange();
            }
        };
        this.onWarning = (err) => {
            var _b;
            if (this.isRunMode) {
                // eslint-disable-next-line
                console.log(chalk_1.default.yellow(err.message));
            }
            else {
                const warning = {
                    id: lodash_1.default.uniqueId('Warning'),
                    title: `Warning: ${underscore_string_1.default.titleize(underscore_string_1.default.humanize((_b = err.type) !== null && _b !== void 0 ? _b : ''))}`,
                    cypressError: err,
                };
                this.update((d) => {
                    d.diagnostics.warnings.push(warning);
                });
                this.emitter.errorWarningChange();
            }
        };
        const { modeOptions, ...rest } = _config;
        this._config = rest;
        this._modeOptions = modeOptions !== null && modeOptions !== void 0 ? modeOptions : {}; // {} For legacy tests
        this._coreData = (_b = _config.coreData) !== null && _b !== void 0 ? _b : (0, coreDataShape_1.makeCoreData)(this._modeOptions);
        this.lifecycleManager = new ProjectLifecycleManager_1.ProjectLifecycleManager(this);
    }
    get config() {
        return this._config;
    }
    get git() {
        return this.coreData.currentProjectGitInfo;
    }
    get isRunMode() {
        return this.config.mode === 'run';
    }
    get isOpenMode() {
        return !this.isRunMode;
    }
    get graphql() {
        return new sources_1.GraphQLDataSource();
    }
    get remoteRequest() {
        return new sources_1.RemoteRequestDataSource();
    }
    get modeOptions() {
        return this._modeOptions;
    }
    get coreData() {
        return this._coreData;
    }
    get file() {
        return new sources_1.FileDataSource(this);
    }
    get versions() {
        return new sources_1.VersionsDataSource(this);
    }
    get browser() {
        return new sources_1.BrowserDataSource(this);
    }
    /**
     * All mutations (update / delete / create), fs writes, etc.
     * should run through this namespace. Everything else should be a "getter"
     */
    get actions() {
        return new DataActions_1.DataActions(this);
    }
    get wizard() {
        return new sources_1.WizardDataSource(this);
    }
    get currentProject() {
        return this.coreData.currentProject;
    }
    get project() {
        return new sources_1.ProjectDataSource(this);
    }
    get relevantRuns() {
        return new sources_1.RelevantRunsDataSource(this);
    }
    get relevantRunSpecs() {
        return new sources_1.RelevantRunSpecsDataSource(this);
    }
    get cloud() {
        return new sources_1.CloudDataSource({
            fetch: (...args) => this.util.fetch(...args),
            getUser: () => this.coreData.user,
            logout: () => this.actions.auth.logout().catch(this.logTraceError),
            invalidateClientUrqlCache: () => this.graphql.invalidateClientUrqlCache(this),
            headers: {
                getMachineId: this.coreData.machineId,
            },
        });
    }
    get env() {
        return new sources_1.EnvDataSource(this);
    }
    get emitter() {
        return new actions_1.DataEmitterActions(this);
    }
    get html() {
        return new sources_1.HtmlDataSource(this);
    }
    get error() {
        return new sources_1.ErrorDataSource(this);
    }
    get util() {
        return new sources_1.UtilDataSource(this);
    }
    get migration() {
        return new sources_1.MigrationDataSource(this);
    }
    // Utilities
    get fs() {
        return fs_extra_1.default;
    }
    get path() {
        return path_1.default;
    }
    get _apis() {
        return {
            appApi: this.config.appApi,
            authApi: this.config.authApi,
            browserApi: this.config.browserApi,
            projectApi: this.config.projectApi,
            electronApi: this.config.electronApi,
            localSettingsApi: this.config.localSettingsApi,
            cohortsApi: this.config.cohortsApi,
        };
    }
    makeId(typeName, nodeString) {
        return Buffer.from(`${typeName}:${nodeString}`).toString('base64');
    }
    // TODO(tim): type check
    fromId(str, accepted) {
        const result = Buffer.from(str, 'base64').toString('utf-8');
        const [type, val] = result.split(':');
        if (type !== accepted) {
            throw new Error(`Expecting node with type ${accepted} saw ${type}`);
        }
        return val;
    }
    logTraceError(e) {
        // TODO(tim): handle this consistently
        // eslint-disable-next-line no-console
        console.error(e);
    }
    async destroy() {
        return Promise.all([
            this.actions.servers.destroyGqlServer(),
            this._reset(),
        ]);
    }
    /**
     * Resets all of the state for the data context,
     * so we can initialize fresh for each E2E test
     */
    async reinitializeCypress(modeOptions = {}) {
        await this._reset();
        this._modeOptions = modeOptions;
        this._coreData = (0, coreDataShape_1.makeCoreData)(modeOptions);
        // @ts-expect-error - we've already cleaned up, this is for testing only
        this.lifecycleManager = new ProjectLifecycleManager_1.ProjectLifecycleManager(this);
        _1.globalPubSub.emit('reset:data-context', this);
    }
    _reset() {
        tslib_1.__classPrivateFieldSet(_a, _a, 0, "f", _DataContext_activeRequestCount);
        this.actions.servers.setAppSocketServer(undefined);
        this.actions.servers.setGqlSocketServer(undefined);
        (0, config_1.resetIssuedWarnings)();
        return Promise.all([
            this.lifecycleManager.destroy(),
            this.cloud.reset(),
            this.actions.project.clearCurrentProject(),
            this.actions.dev.dispose(),
        ]);
    }
    async initializeMode() {
        (0, assert_1.default)(!this.coreData.hasInitializedMode);
        this.coreData.hasInitializedMode = this.config.mode;
        if (this.config.mode === 'run') {
            await this.lifecycleManager.initializeRunMode(this.coreData.currentTestingType);
        }
        else if (this.config.mode === 'open') {
            await this.initializeOpenMode();
            await this.lifecycleManager.initializeOpenMode(this.coreData.currentTestingType);
        }
        else {
            throw new Error(`Missing DataContext config "mode" setting, expected run | open`);
        }
    }
    async initializeOpenMode() {
        if (IS_DEV_ENV && !process.env.CYPRESS_INTERNAL_E2E_TESTING_SELF) {
            this.actions.dev.watchForRelaunch();
        }
        // We want to fetch the user immediately, but we don't need to block the UI on this
        this.actions.auth.getUser().catch((e) => {
            // This error should never happen, since it's internally handled by getUser
            // Log anyway, just incase
            this.logTraceError(e);
        });
        const toAwait = [
            this.actions.localSettings.refreshLocalSettings(),
        ];
        // load projects from cache on start
        toAwait.push(this.actions.project.loadProjects());
        await Promise.all(toAwait);
    }
    static addActiveRequest() {
        var _b;
        tslib_1.__classPrivateFieldSet(this, _a, (_b = tslib_1.__classPrivateFieldGet(this, _a, "f", _DataContext_activeRequestCount), _b++, _b), "f", _DataContext_activeRequestCount);
    }
    static finishActiveRequest() {
        var _b;
        tslib_1.__classPrivateFieldSet(this, _a, (_b = tslib_1.__classPrivateFieldGet(this, _a, "f", _DataContext_activeRequestCount), _b--, _b), "f", _DataContext_activeRequestCount);
        if (tslib_1.__classPrivateFieldGet(this, _a, "f", _DataContext_activeRequestCount) === 0) {
            tslib_1.__classPrivateFieldGet(this, _a, "f", _DataContext_awaitingEmptyRequestCount).forEach((fn) => fn());
            tslib_1.__classPrivateFieldSet(this, _a, [], "f", _DataContext_awaitingEmptyRequestCount);
        }
    }
    static async waitForActiveRequestsToFlush() {
        if (tslib_1.__classPrivateFieldGet(this, _a, "f", _DataContext_activeRequestCount) === 0) {
            return;
        }
        return new Promise((resolve) => {
            tslib_1.__classPrivateFieldGet(this, _a, "f", _DataContext_awaitingEmptyRequestCount).push(resolve);
        });
    }
}
exports.DataContext = DataContext;
_a = DataContext;
_DataContext_activeRequestCount = { value: 0 };
_DataContext_awaitingEmptyRequestCount = { value: [] };
tslib_1.__decorate([
    cached_1.cached
], DataContext.prototype, "graphql", null);
tslib_1.__decorate([
    cached_1.cached
], DataContext.prototype, "remoteRequest", null);
tslib_1.__decorate([
    cached_1.cached
], DataContext.prototype, "file", null);
tslib_1.__decorate([
    cached_1.cached
], DataContext.prototype, "versions", null);
tslib_1.__decorate([
    cached_1.cached
], DataContext.prototype, "browser", null);
tslib_1.__decorate([
    cached_1.cached
], DataContext.prototype, "actions", null);
tslib_1.__decorate([
    cached_1.cached
], DataContext.prototype, "wizard", null);
tslib_1.__decorate([
    cached_1.cached
], DataContext.prototype, "project", null);
tslib_1.__decorate([
    cached_1.cached
], DataContext.prototype, "relevantRuns", null);
tslib_1.__decorate([
    cached_1.cached
], DataContext.prototype, "relevantRunSpecs", null);
tslib_1.__decorate([
    cached_1.cached
], DataContext.prototype, "cloud", null);
tslib_1.__decorate([
    cached_1.cached
], DataContext.prototype, "env", null);
tslib_1.__decorate([
    cached_1.cached
], DataContext.prototype, "emitter", null);
tslib_1.__decorate([
    cached_1.cached
], DataContext.prototype, "html", null);
tslib_1.__decorate([
    cached_1.cached
], DataContext.prototype, "error", null);
tslib_1.__decorate([
    cached_1.cached
], DataContext.prototype, "util", null);
tslib_1.__decorate([
    cached_1.cached
], DataContext.prototype, "migration", null);
tslib_1.__decorate([
    cached_1.cached
], DataContext.prototype, "fs", null);
tslib_1.__decorate([
    cached_1.cached
], DataContext.prototype, "path", null);
