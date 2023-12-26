"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MigrationActions = exports.processConfigViaLegacyPlugins = exports.getDiff = exports.getConfigWithDefaults = void 0;
const tslib_1 = require("tslib");
/* eslint-disable no-dupe-class-members */
const path_1 = tslib_1.__importDefault(require("path"));
const debug_1 = tslib_1.__importDefault(require("debug"));
const child_process_1 = require("child_process");
const fs_extra_1 = tslib_1.__importDefault(require("fs-extra"));
const semver_1 = tslib_1.__importDefault(require("semver"));
const assert_1 = tslib_1.__importDefault(require("assert"));
const lodash_1 = tslib_1.__importDefault(require("lodash"));
const errors_1 = require(process.argv[1]+"/../packages/errors");
const sources_1 = require("../sources");
const migration_1 = require("../sources/migration");
const data_1 = require("../data");
const LegacyPluginsIpc_1 = require("../data/LegacyPluginsIpc");
const util_1 = require("../util");
const debug = (0, debug_1.default)('cypress:data-context:MigrationActions');
const tsNode = (0, util_1.toPosix)(require.resolve(process.argv[1]+'/../packages/server/lib/plugins/child/register_ts_node'));
function getConfigWithDefaults(legacyConfig) {
    const newConfig = lodash_1.default.cloneDeep(legacyConfig);
    migration_1.legacyOptions.forEach(({ defaultValue, name }) => {
        if (defaultValue !== undefined && legacyConfig[name] === undefined) {
            newConfig[name] = typeof defaultValue === 'function' ? defaultValue() : defaultValue;
        }
    });
    return newConfig;
}
exports.getConfigWithDefaults = getConfigWithDefaults;
function getDiff(oldConfig, newConfig) {
    // get all the values updated
    const result = lodash_1.default.reduce(oldConfig, (acc, value, key) => {
        // ignore values that have been removed
        if (newConfig[key] && !lodash_1.default.isEqual(value, newConfig[key])) {
            acc[key] = newConfig[key];
        }
        return acc;
    }, {});
    // get all the values added
    return lodash_1.default.reduce(newConfig, (acc, value, key) => {
        // their key is in the new config but not in the old config
        if (!oldConfig.hasOwnProperty(key)) {
            acc[key] = value;
        }
        return acc;
    }, result);
}
exports.getDiff = getDiff;
async function processConfigViaLegacyPlugins(projectRoot, legacyConfig) {
    const pluginFile = legacyConfig.pluginsFile
        ? await (0, migration_1.getLegacyPluginsCustomFilePath)(projectRoot, legacyConfig.pluginsFile)
        : await (0, migration_1.tryGetDefaultLegacyPluginsFile)(projectRoot);
    debug('found legacy pluginsFile at %s', pluginFile);
    return new Promise((resolve, reject) => {
        // couldn't find a pluginsFile
        // just bail with initial config
        if (!pluginFile) {
            return resolve(legacyConfig);
        }
        const cwd = path_1.default.join(projectRoot, pluginFile);
        const childOptions = {
            stdio: 'inherit',
            cwd: path_1.default.dirname(cwd),
            env: lodash_1.default.omit(process.env, 'CYPRESS_INTERNAL_E2E_TESTING_SELF'),
        };
        const configProcessArgs = ['--projectRoot', projectRoot, '--file', cwd];
        const CHILD_PROCESS_FILE_PATH = require.resolve(process.argv[1]+'/../packages/server/lib/plugins/child/require_async_child');
        // use ts-node if they've got typescript installed
        // this matches the 9.x behavior, which is what we want for
        // processing legacy pluginsFile (we never supported `"type": "module") in 9.x.
        if ((0, util_1.hasTypeScriptInstalled)(projectRoot)) {
            const tsNodeLoader = `--require "${tsNode}"`;
            if (!childOptions.env) {
                childOptions.env = {};
            }
            if (childOptions.env.NODE_OPTIONS) {
                childOptions.env.NODE_OPTIONS += ` ${tsNodeLoader}`;
            }
            else {
                childOptions.env.NODE_OPTIONS = tsNodeLoader;
            }
        }
        const childProcess = (0, child_process_1.fork)(CHILD_PROCESS_FILE_PATH, configProcessArgs, childOptions);
        const ipc = new LegacyPluginsIpc_1.LegacyPluginsIpc(childProcess);
        childProcess.on('error', (error) => {
            error = (0, errors_1.getError)('LEGACY_CONFIG_ERROR_DURING_MIGRATION', cwd, error);
            reject(error);
            ipc.killChildProcess();
        });
        const legacyConfigWithDefaults = getConfigWithDefaults(legacyConfig);
        ipc.on('ready', () => {
            debug('legacyConfigIpc:ready');
            ipc.send('loadLegacyPlugins', legacyConfigWithDefaults);
        });
        ipc.on('loadLegacyPlugins:reply', (modifiedLegacyConfig) => {
            debug('loadLegacyPlugins:reply');
            const diff = getDiff(legacyConfigWithDefaults, modifiedLegacyConfig);
            // if env is updated by plugins, avoid adding it to the config file
            if (diff.env) {
                delete diff.env;
            }
            const legacyConfigWithChanges = lodash_1.default.merge(legacyConfig, diff);
            resolve(legacyConfigWithChanges);
            ipc.killChildProcess();
        });
        ipc.on('loadLegacyPlugins:error', (error) => {
            debug('loadLegacyPlugins:error');
            error = (0, errors_1.getError)('LEGACY_CONFIG_ERROR_DURING_MIGRATION', cwd, error);
            reject(error);
            ipc.killChildProcess();
        });
        ipc.on('childProcess:unhandledError', (error) => {
            debug('childProcess:unhandledError');
            reject(error);
            ipc.killChildProcess();
        });
    });
}
exports.processConfigViaLegacyPlugins = processConfigViaLegacyPlugins;
class MigrationActions {
    constructor(ctx) {
        this.ctx = ctx;
    }
    async initialize(config) {
        const legacyConfigForMigration = await this.setLegacyConfigForMigration(config);
        this.reset(legacyConfigForMigration);
        if (!this.ctx.currentProject || !legacyConfigForMigration) {
            throw Error('cannot do migration without currentProject!');
        }
        if (this.ctx.coreData.app.isGlobalMode) {
            const version = await this.locallyInstalledCypressVersion(this.ctx.currentProject);
            if (!version) {
                // Could not resolve Cypress. Unlikely, but they are using a
                // project with Cypress that is nested more deeply than
                // another project, which has a `cypress.json` but has not had
                // it's node_modules installed, or it relies on a global version
                // of Cypress that is missing for whatever reason.
                return this.ctx.onError((0, errors_1.getError)('MIGRATION_CYPRESS_NOT_FOUND'));
            }
            const currentVersion = (await this.ctx.versions.versionData()).current.version;
            // Validate that the project being migrated has a version of Cypress compatible with the version being executed.
            // This handles situations where Cypress is launched in global mode to migrate a project with an older version of
            // Cypress as a dependency which could break the project when launched directly.
            // For example:
            //    Local: 9.6.0     Global: 10.0.0     FAIL
            //    Local: 10.0.1    Global: 10.0.0     PASS
            //    Local: 12.0.0    Global: 12.0.1     FAIL
            if (!semver_1.default.satisfies(version, `^${currentVersion}`)) {
                return this.ctx.onError((0, errors_1.getError)('MIGRATION_MISMATCHED_CYPRESS_VERSIONS', version, currentVersion));
            }
        }
        await this.initializeFlags();
        const legacyConfigFileExist = this.ctx.migration.legacyConfigFileExists();
        const filteredSteps = await (0, migration_1.getStepsForMigration)(this.ctx.currentProject, legacyConfigForMigration, Boolean(legacyConfigFileExist));
        this.ctx.update((coreData) => {
            if (!filteredSteps[0]) {
                throw Error(`Impossible to initialize a migration. No steps fit the configuration of this project.`);
            }
            coreData.migration.filteredSteps = filteredSteps;
            coreData.migration.step = filteredSteps[0];
        });
    }
    async locallyInstalledCypressVersion(currentProject) {
        var _a;
        try {
            const localCypressPkgJsonPath = require.resolve(path_1.default.join('cypress', 'package.json'), {
                paths: [currentProject],
            });
            const localCypressPkgJson = await fs_extra_1.default.readJson(path_1.default.join(localCypressPkgJsonPath));
            return (_a = localCypressPkgJson === null || localCypressPkgJson === void 0 ? void 0 : localCypressPkgJson.version) !== null && _a !== void 0 ? _a : undefined;
        }
        catch (e) {
            // node_modules was not found, or some other unexpected error
            // return undefined and surface the correct error.
            return undefined;
        }
    }
    /**
     * Figure out all the data required for the migration UI.
     * This drives which migration steps need be shown and performed.
     */
    async initializeFlags() {
        var _a;
        const legacyConfigForMigration = this.ctx.coreData.migration.legacyConfigForMigration;
        if (!this.ctx.currentProject || !legacyConfigForMigration) {
            throw Error('Need currentProject to do migration');
        }
        const integrationFolder = (0, migration_1.getIntegrationFolder)(legacyConfigForMigration);
        const integrationTestFiles = (0, migration_1.getIntegrationTestFilesGlobs)(legacyConfigForMigration);
        const hasCustomIntegrationFolder = (0, migration_1.getIntegrationFolder)(legacyConfigForMigration) !== migration_1.legacyIntegrationFolder;
        const hasCustomIntegrationTestFiles = !(0, migration_1.isDefaultTestFiles)(legacyConfigForMigration, 'integration');
        const shouldAddCustomE2ESpecPattern = Boolean(this.ctx.migration.legacyConfigProjectId);
        let hasE2ESpec = integrationFolder
            ? await (0, migration_1.hasSpecFile)(this.ctx.currentProject, integrationFolder, integrationTestFiles)
            : false;
        // if we don't find specs in the 9.X scope,
        // let's check already migrated files.
        // this allows users to stop migration halfway,
        // then to pick up where they left migration off
        if (!hasE2ESpec && (!hasCustomIntegrationTestFiles || !hasCustomIntegrationFolder)) {
            const newE2eSpecPattern = (0, migration_1.getSpecPattern)(legacyConfigForMigration, 'e2e', shouldAddCustomE2ESpecPattern);
            hasE2ESpec = await (0, migration_1.hasSpecFile)(this.ctx.currentProject, '', newE2eSpecPattern);
        }
        const componentFolder = (0, migration_1.getComponentFolder)(legacyConfigForMigration);
        const componentTestFiles = (0, migration_1.getComponentTestFilesGlobs)(legacyConfigForMigration);
        const hasCustomComponentFolder = componentFolder !== 'cypress/component';
        const hasCustomComponentTestFiles = !(0, migration_1.isDefaultTestFiles)(legacyConfigForMigration, 'component');
        // A user is considered to "have" component testing if either
        // 1. they have a default component folder (cypress/component) with at least 1 spec file
        // OR
        // 2. they have configured a non-default componentFolder (even if it doesn't have any specs.)
        const hasSpecInDefaultComponentFolder = await (0, migration_1.hasSpecFile)(this.ctx.currentProject, componentFolder, componentTestFiles);
        const hasComponentTesting = (_a = (hasCustomComponentFolder || hasSpecInDefaultComponentFolder)) !== null && _a !== void 0 ? _a : false;
        this.ctx.update((coreData) => {
            coreData.migration.flags = {
                hasCustomIntegrationFolder,
                hasCustomIntegrationTestFiles,
                hasCustomComponentFolder,
                hasCustomComponentTestFiles,
                hasCustomSupportFile: false,
                hasComponentTesting,
                hasE2ESpec,
                hasPluginsFile: true,
                shouldAddCustomE2ESpecPattern,
            };
        });
    }
    get configFileNameAfterMigration() {
        return this.ctx.migration.legacyConfigFile.replace('.json', `.config.${this.ctx.lifecycleManager.fileExtensionToUse}`);
    }
    async createConfigFile() {
        const config = await this.ctx.migration.createConfigString();
        this.ctx.lifecycleManager.setConfigFilePath(this.configFileNameAfterMigration);
        await this.ctx.fs.writeFile(this.ctx.lifecycleManager.configFilePath, config).catch((error) => {
            throw error;
        });
        await this.ctx.actions.file.removeFileInProject(this.ctx.migration.legacyConfigFile).catch((error) => {
            throw error;
        });
        if (this.ctx.modeOptions.configFile) {
            // @ts-ignore configFile needs to be updated with the new one, so it finds the correct one
            // with the new file, instead of the deleted one which is not supported anymore
            this.ctx.modeOptions.configFile = this.ctx.migration.configFileNameAfterMigration;
        }
    }
    async setLegacyConfigForMigration(config) {
        (0, assert_1.default)(this.ctx.currentProject);
        const legacyConfigForMigration = await processConfigViaLegacyPlugins(this.ctx.currentProject, config);
        this.ctx.update((coreData) => {
            coreData.migration.legacyConfigForMigration = legacyConfigForMigration;
        });
        return legacyConfigForMigration;
    }
    async renameSpecsFolder() {
        if (!this.ctx.currentProject) {
            throw Error('Need to set currentProject before you can rename specs folder');
        }
        const projectRoot = this.ctx.path.join(this.ctx.currentProject);
        const from = path_1.default.join(projectRoot, 'cypress', 'integration');
        const to = path_1.default.join(projectRoot, 'cypress', 'e2e');
        this.ctx.update((coreData) => {
            coreData.migration.flags = {
                ...coreData.migration.flags,
                shouldAddCustomE2ESpecPattern: true,
            };
        });
        await this.ctx.fs.move(from, to);
    }
    async renameSpecFiles(beforeSpecs, afterSpecs) {
        if (!this.ctx.currentProject) {
            throw Error('Need to set currentProject before you can rename files');
        }
        const specsToMove = [];
        for (let i = 0; i < beforeSpecs.length; i++) {
            const from = beforeSpecs[i];
            const to = afterSpecs[i];
            if (!from || !to) {
                throw Error(`Must have matching to and from. Got from: ${from} and to: ${to}`);
            }
            specsToMove.push({ from, to });
        }
        const projectRoot = this.ctx.path.join(this.ctx.currentProject);
        await (0, sources_1.moveSpecFiles)(projectRoot, specsToMove);
        await (0, sources_1.cleanUpIntegrationFolder)(this.ctx.currentProject);
    }
    async renameSupportFile() {
        if (!this.ctx.currentProject) {
            throw Error(`Need current project before starting migration!`);
        }
        const result = await (0, migration_1.supportFilesForMigration)(this.ctx.currentProject);
        const beforeRelative = result.before.relative;
        const afterRelative = result.after.relative;
        if (!beforeRelative || !afterRelative) {
            throw new sources_1.NonStandardMigrationError('support');
        }
        await this.ctx.fs.rename(path_1.default.join(this.ctx.currentProject, beforeRelative), path_1.default.join(this.ctx.currentProject, afterRelative));
    }
    async finishReconfigurationWizard() {
        this.ctx.lifecycleManager.refreshMetaState();
        await this.ctx.lifecycleManager.refreshLifecycle();
    }
    async nextStep() {
        const filteredSteps = this.ctx.coreData.migration.filteredSteps;
        const index = filteredSteps.indexOf(this.ctx.coreData.migration.step);
        if (index === -1) {
            throw new Error('Invalid step');
        }
        const nextIndex = index + 1;
        if (nextIndex < filteredSteps.length) {
            const nextStep = filteredSteps[nextIndex];
            if (nextStep) {
                this.ctx.update((coreData) => {
                    coreData.migration.step = nextStep;
                });
            }
        }
        else {
            await this.finishReconfigurationWizard();
        }
    }
    async closeManualRenameWatcher() {
        await this.ctx.migration.closeManualRenameWatcher();
    }
    async assertSuccessfulConfigMigration(migratedConfigFile = 'cypress.config.js') {
        const actual = (0, sources_1.formatConfig)(await this.ctx.file.readFileInProject(migratedConfigFile));
        const configExtension = path_1.default.extname(migratedConfigFile);
        const expected = (0, sources_1.formatConfig)(await this.ctx.file.readFileInProject(`expected-cypress.config${configExtension}`));
        if (actual !== expected) {
            throw Error(`Expected ${actual} to equal ${expected}`);
        }
    }
    reset(config) {
        this.ctx.update((coreData) => {
            coreData.migration = { ...(0, data_1.makeCoreData)().migration, legacyConfigForMigration: config };
        });
    }
}
exports.MigrationActions = MigrationActions;
