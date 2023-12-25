"use strict";
var _VersionsDataSource_instances, _VersionsDataSource_populateVersionMetadata, _VersionsDataSource_getVersionMetadata, _VersionsDataSource_getLatestVersion;
Object.defineProperty(exports, "__esModule", { value: true });
exports.VersionsDataSource = void 0;
const tslib_1 = require("tslib");
const os_1 = tslib_1.__importDefault(require("os"));
const types_1 = require(process.argv[1]+"/../packages/types");
const debug_1 = tslib_1.__importDefault(require("debug"));
const scaffold_config_1 = require(process.argv[1]+"/../packages/scaffold-config");
const debug = (0, debug_1.default)('cypress:data-context:sources:VersionsDataSource');
const pkg = require(process.argv[1]+'/../packages/root');
class VersionsDataSource {
    constructor(ctx) {
        _VersionsDataSource_instances.add(this);
        this.ctx = ctx;
        this._initialLaunch = true;
        this._currentTestingType = this.ctx.coreData.currentTestingType;
    }
    /**
     * Returns most recent and current version of Cypress
     * {
     *   current: {
     *     id: '8.7.0',
     *     version: '8.7.0',
     *     released: '2021-10-15T21:38:59.983Z'
     *   },
     *   latest: {
     *     id: '8.8.0',
     *     version: '8.8.0',
     *     released: '2021-10-25T21:38:59.983Z'
     *   }
     * }
     */
    async versionData() {
        var _a, _b;
        const versionData = tslib_1.__classPrivateFieldGet(this, _VersionsDataSource_instances, "m", _VersionsDataSource_populateVersionMetadata).call(this);
        const [latestVersion, npmMetadata] = await Promise.all([
            versionData.latestVersion,
            versionData.npmMetadata,
        ]);
        const latestVersionMetadata = {
            id: latestVersion,
            version: latestVersion,
            released: (_a = npmMetadata[latestVersion]) !== null && _a !== void 0 ? _a : new Date().toISOString(),
        };
        return {
            latest: latestVersionMetadata,
            current: {
                id: pkg.version,
                version: pkg.version,
                released: (_b = npmMetadata[pkg.version]) !== null && _b !== void 0 ? _b : new Date().toISOString(),
            },
        };
    }
    resetLatestVersionTelemetry() {
        if (this.ctx.coreData.currentTestingType !== this._currentTestingType) {
            debug('resetting latest version telemetry call due to a different testing type');
            this._currentTestingType = this.ctx.coreData.currentTestingType;
            this.ctx.update((d) => {
                if (d.versionData) {
                    d.versionData.latestVersion = tslib_1.__classPrivateFieldGet(this, _VersionsDataSource_instances, "m", _VersionsDataSource_getLatestVersion).call(this);
                }
            });
        }
    }
    isFulfilled(item) {
        return item.status === 'fulfilled';
    }
}
exports.VersionsDataSource = VersionsDataSource;
_VersionsDataSource_instances = new WeakSet(), _VersionsDataSource_populateVersionMetadata = function _VersionsDataSource_populateVersionMetadata() {
    let versionData = this.ctx.coreData.versionData;
    if (!versionData) {
        versionData = {
            latestVersion: tslib_1.__classPrivateFieldGet(this, _VersionsDataSource_instances, "m", _VersionsDataSource_getLatestVersion).call(this).catch((e) => pkg.version),
            npmMetadata: tslib_1.__classPrivateFieldGet(this, _VersionsDataSource_instances, "m", _VersionsDataSource_getVersionMetadata).call(this).catch((e) => ({})),
        };
        this.ctx.update((d) => {
            d.versionData = versionData;
        });
    }
    return versionData;
}, _VersionsDataSource_getVersionMetadata = async function _VersionsDataSource_getVersionMetadata() {
    var _a;
    const now = new Date().toISOString();
    const DEFAULT_RESPONSE = {
        [pkg.version]: now,
    };
    if (this.ctx.isRunMode) {
        return DEFAULT_RESPONSE;
    }
    let response;
    try {
        response = await this.ctx.util.fetch(types_1.NPM_CYPRESS_REGISTRY_URL);
        const responseJson = await response.json();
        debug('NPM release dates received %o', { modified: responseJson.time.modified });
        return (_a = responseJson.time) !== null && _a !== void 0 ? _a : now;
    }
    catch (e) {
        // ignore any error from this fetch, they are gracefully handled
        // by showing the current version only
        debug('Error fetching %o', types_1.NPM_CYPRESS_REGISTRY_URL, e);
        return DEFAULT_RESPONSE;
    }
}, _VersionsDataSource_getLatestVersion = async function _VersionsDataSource_getLatestVersion() {
    var _a, _b, _c, _d, _e;
    if (this.ctx.isRunMode) {
        return pkg.version;
    }
    debug('#getLatestVersion');
    const preferences = await this.ctx.config.localSettingsApi.getPreferences();
    const notificationPreferences = [
        ...(_a = preferences.notifyWhenRunCompletes) !== null && _a !== void 0 ? _a : [],
    ];
    if (preferences.notifyWhenRunStarts) {
        notificationPreferences.push('started');
    }
    if (preferences.notifyWhenRunStartsFailing) {
        notificationPreferences.push('failing');
    }
    const id = (await this.ctx.coreData.machineId) || undefined;
    const manifestHeaders = {
        'Content-Type': 'application/json',
        'x-cypress-version': pkg.version,
        'x-os-name': os_1.default.platform(),
        'x-arch': os_1.default.arch(),
        'x-notifications': notificationPreferences.join(','),
        'x-initial-launch': String(this._initialLaunch),
        'x-logged-in': String(!!this.ctx.coreData.user),
    };
    if (this._currentTestingType) {
        manifestHeaders['x-testing-type'] = this._currentTestingType;
    }
    if (id) {
        manifestHeaders['x-machine-id'] = id;
    }
    const devServer = (_d = (_c = (_b = this.ctx.lifecycleManager) === null || _b === void 0 ? void 0 : _b.loadedConfigFile) === null || _c === void 0 ? void 0 : _c.component) === null || _d === void 0 ? void 0 : _d.devServer;
    if (typeof devServer === 'object') {
        if (devServer.bundler) {
            manifestHeaders['x-dev-server'] = devServer.bundler;
        }
        if (devServer.framework) {
            manifestHeaders['x-framework'] = devServer.framework;
        }
    }
    if (this._initialLaunch) {
        try {
            const projectPath = this.ctx.currentProject;
            if (projectPath) {
                debug('Checking %d dependencies in project', scaffold_config_1.dependencyNamesToDetect.length);
                // Check all dependencies of interest in parallel
                const dependencyResults = await Promise.allSettled(scaffold_config_1.dependencyNamesToDetect.map(async (dependency) => {
                    const result = await this.ctx.util.isDependencyInstalledByName(dependency, projectPath);
                    if (!result.detectedVersion) {
                        throw new Error(`Could not resolve dependency version for ${dependency}`);
                    }
                    // For any satisfied dependencies, build a `package@version` string
                    return `${result.dependency}@${result.detectedVersion}`;
                }));
                // Take any dependencies that were found and combine into comma-separated string
                const headerValue = dependencyResults
                    .filter(this.isFulfilled)
                    .map((result) => result.value)
                    .join(',');
                if (headerValue) {
                    manifestHeaders['x-dependencies'] = headerValue;
                }
            }
            else {
                debug('No project path, skipping dependency check');
            }
        }
        catch (err) {
            debug('Failed to detect project dependencies', err);
        }
    }
    else {
        debug('Not initial launch of Cypress, skipping dependency check');
    }
    try {
        const manifestResponse = await this.ctx.util.fetch(types_1.CYPRESS_REMOTE_MANIFEST_URL, {
            headers: manifestHeaders,
        });
        debug('retrieving latest version information with headers: %o', manifestHeaders);
        const manifest = await manifestResponse.json();
        debug('latest version information: %o', manifest);
        return (_e = manifest.version) !== null && _e !== void 0 ? _e : pkg.version;
    }
    catch (e) {
        // ignore any error from this fetch, they are gracefully handled
        // by showing the current version only
        debug('Error fetching %s: %o', types_1.CYPRESS_REMOTE_MANIFEST_URL, e);
        return pkg.version;
    }
    finally {
        this._initialLaunch = false;
    }
};
