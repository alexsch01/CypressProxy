"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStepsForMigration = exports.shouldShowConfigFileStep = exports.shouldShowRenameSupport = exports.shouldShowAutoRenameStep = exports.getComponentFolder = exports.getIntegrationFolder = exports.getPluginsFile = exports.isDefaultTestFiles = exports.getComponentTestFilesGlobs = exports.getIntegrationTestFilesGlobs = exports.defaultTestFilesGlob = void 0;
const tslib_1 = require("tslib");
const globby_1 = tslib_1.__importDefault(require("globby"));
const path_1 = tslib_1.__importDefault(require("path"));
const types_1 = require(process.argv[1]+"/../packages/types");
const _1 = require(".");
exports.defaultTestFilesGlob = '**/*.{js,ts,jsx,tsx,coffee,cjsx}';
function getTestFilesGlobs(config, type) {
    var _a, _b;
    // super awkward how we call it integration tests, but the key to override
    // the config is `e2e`
    const k = type === 'component' ? 'component' : 'e2e';
    const glob = (_b = (_a = config[k]) === null || _a === void 0 ? void 0 : _a.testFiles) !== null && _b !== void 0 ? _b : config.testFiles;
    if (glob) {
        return [].concat(glob);
    }
    return [exports.defaultTestFilesGlob];
}
function getIntegrationTestFilesGlobs(config) {
    return getTestFilesGlobs(config, 'integration');
}
exports.getIntegrationTestFilesGlobs = getIntegrationTestFilesGlobs;
function getComponentTestFilesGlobs(config) {
    return getTestFilesGlobs(config, 'component');
}
exports.getComponentTestFilesGlobs = getComponentTestFilesGlobs;
function isDefaultTestFiles(config, type) {
    const testFiles = type === 'component'
        ? getComponentTestFilesGlobs(config)
        : getIntegrationTestFilesGlobs(config);
    return testFiles.length === 1 && testFiles[0] === exports.defaultTestFilesGlob;
}
exports.isDefaultTestFiles = isDefaultTestFiles;
function getPluginsFile(config) {
    var _a, _b, _c, _d;
    if (((_a = config.e2e) === null || _a === void 0 ? void 0 : _a.pluginsFile) === false || config.pluginsFile === false) {
        return false;
    }
    return (_d = (_c = (_b = config.e2e) === null || _b === void 0 ? void 0 : _b.pluginsFile) !== null && _c !== void 0 ? _c : config.pluginsFile) !== null && _d !== void 0 ? _d : 'cypress/plugins/index.js';
}
exports.getPluginsFile = getPluginsFile;
function getIntegrationFolder(config) {
    var _a, _b, _c;
    return (_c = (_b = (_a = config.e2e) === null || _a === void 0 ? void 0 : _a.integrationFolder) !== null && _b !== void 0 ? _b : config.integrationFolder) !== null && _c !== void 0 ? _c : _1.legacyIntegrationFolder;
}
exports.getIntegrationFolder = getIntegrationFolder;
function getComponentFolder(config) {
    var _a, _b, _c, _d;
    if (((_a = config.component) === null || _a === void 0 ? void 0 : _a.componentFolder) === false || config.componentFolder === false) {
        return false;
    }
    return (_d = (_c = (_b = config.component) === null || _b === void 0 ? void 0 : _b.componentFolder) !== null && _c !== void 0 ? _c : config.componentFolder) !== null && _d !== void 0 ? _d : 'cypress/component';
}
exports.getComponentFolder = getComponentFolder;
async function hasSpecFiles(projectRoot, dir, testFilesGlob) {
    const f = await (0, globby_1.default)(testFilesGlob, { cwd: path_1.default.join(projectRoot, dir) });
    return f.length > 0;
}
async function shouldShowAutoRenameStep(projectRoot, config) {
    var _a;
    const specsToAutoMigrate = await (0, _1.getSpecs)(projectRoot, config);
    const e2eMigrationOptions = {
        // If the configFile has projectId, we do not want to change the preExtension
        // so, we can keep the cloud history
        shouldMigratePreExtension: !config.projectId && !((_a = config.e2e) === null || _a === void 0 ? void 0 : _a.projectId),
    };
    const integrationCleaned = specsToAutoMigrate.integration.filter((spec) => {
        const transformed = (0, _1.applyMigrationTransform)(spec, e2eMigrationOptions);
        return transformed.before.relative !== transformed.after.relative;
    });
    const componentCleaned = specsToAutoMigrate.component.filter((spec) => {
        const transformed = (0, _1.applyMigrationTransform)(spec);
        return transformed.before.relative !== transformed.after.relative;
    });
    // if we have at least one spec to auto migrate in either Ct or E2E, we return true.
    return integrationCleaned.length > 0 || componentCleaned.length > 0;
}
exports.shouldShowAutoRenameStep = shouldShowAutoRenameStep;
async function anyComponentSpecsExist(projectRoot, config) {
    const componentFolder = getComponentFolder(config);
    if (componentFolder === false) {
        return false;
    }
    const componentTestFiles = getComponentTestFilesGlobs(config);
    return hasSpecFiles(projectRoot, componentFolder, componentTestFiles);
}
async function anyIntegrationSpecsExist(projectRoot, config) {
    const integrationFolder = getIntegrationFolder(config);
    const integrationTestFiles = getIntegrationTestFilesGlobs(config);
    return hasSpecFiles(projectRoot, integrationFolder, integrationTestFiles);
}
// we only show rename support file if they are using the default
// if they have anything set in their config, we will not try to rename it.
// Also, if there are no **no** integration specs, we are doing a CT only migration,
// in which case we don't migrate the supportFile - they'll make a new support/component.js
// when they set CT up.
async function shouldShowRenameSupport(projectRoot, config) {
    var _a, _b;
    if (!await anyIntegrationSpecsExist(projectRoot, config)) {
        return false;
    }
    let supportFile = (_b = (_a = config.e2e) === null || _a === void 0 ? void 0 : _a.supportFile) !== null && _b !== void 0 ? _b : config.supportFile;
    if (supportFile === undefined) {
        const foundDefaultSupportFile = await (0, _1.tryGetDefaultLegacySupportFile)(projectRoot);
        if (foundDefaultSupportFile) {
            supportFile = foundDefaultSupportFile;
        }
    }
    // if the support file is set to false, we don't show the rename step
    // if the support file does not exist (value is undefined), we don't show the rename step
    if (!supportFile) {
        return false;
    }
    // if the support file is custom, we don't show the rename step
    // only if the support file matches the default do we show the rename step
    return (0, _1.isDefaultSupportFile)(supportFile);
}
exports.shouldShowRenameSupport = shouldShowRenameSupport;
// if they have component testing configured using the defaults, they will need to
// rename/move their specs.
async function shouldShowRenameManual(projectRoot, config) {
    const componentFolder = getComponentFolder(config);
    const usingAllDefaults = componentFolder === 'cypress/component' && isDefaultTestFiles(config, 'component');
    if (componentFolder === false || !usingAllDefaults) {
        return false;
    }
    return anyComponentSpecsExist(projectRoot, config);
}
// All projects must move from cypress.json to cypress.config.js!
function shouldShowConfigFileStep(config) {
    return true;
}
exports.shouldShowConfigFileStep = shouldShowConfigFileStep;
async function getStepsForMigration(projectRoot, config, configFileExists) {
    const steps = [];
    for (const step of types_1.MIGRATION_STEPS) {
        if (step === 'renameAuto' && await shouldShowAutoRenameStep(projectRoot, config)) {
            steps.push(step);
        }
        if (step === 'renameManual' && await shouldShowRenameManual(projectRoot, config)) {
            steps.push(step);
        }
        if (step === 'renameSupport' && await shouldShowRenameSupport(projectRoot, config)) {
            steps.push(step);
        }
        if (step === 'configFile' && configFileExists) {
            steps.push(step);
        }
        // if we are showing rename manual, this implies
        // component testing is configured.
        if (step === 'setupComponent' && await anyComponentSpecsExist(projectRoot, config)) {
            steps.push(step);
        }
    }
    return steps;
}
exports.getStepsForMigration = getStepsForMigration;
