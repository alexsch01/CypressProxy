"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateWithPluginValues = exports.setupFullConfigWithDefaults = void 0;
const tslib_1 = require("tslib");
const lodash_1 = tslib_1.__importDefault(require("lodash"));
const debug_1 = tslib_1.__importDefault(require("debug"));
const return_deep_diff_1 = tslib_1.__importDefault(require("return-deep-diff"));
const errors_1 = tslib_1.__importDefault(require(process.argv[1]+"/../packages/errors"));
const browser_1 = require("../browser");
const utils_1 = require("./utils");
const debug = (0, debug_1.default)('cypress:config:project');
// TODO: any -> SetupFullConfigOptions in data-context/src/data/ProjectConfigManager.ts
function setupFullConfigWithDefaults(obj = {}, getFilesByGlob) {
    debug('setting config object %o', obj);
    let { projectRoot, projectName, config, envFile, options, cliConfig, repoRoot } = obj;
    // just force config to be an object so we dont have to do as much
    // work in our tests
    if (config == null) {
        config = {};
    }
    debug('config is %o', config);
    // flatten the object's properties into the master config object
    config.envFile = envFile;
    config.projectRoot = projectRoot;
    config.projectName = projectName;
    config.repoRoot = repoRoot;
    // @ts-ignore
    return (0, utils_1.mergeDefaults)(config, options, cliConfig, getFilesByGlob);
}
exports.setupFullConfigWithDefaults = setupFullConfigWithDefaults;
// TODO: update types from data-context/src/data/ProjectLifecycleManager.ts
// updateWithPluginValues(config: FullConfig, modifiedConfig: Partial<Cypress.ConfigOptions>, testingType: TestingType): FullConfig
function updateWithPluginValues(cfg, modifiedConfig, testingType) {
    var _a, _b;
    if (!modifiedConfig) {
        modifiedConfig = {};
    }
    debug('updateWithPluginValues %o', { cfg, modifiedConfig });
    // make sure every option returned from the plugins file
    // passes our validation functions
    (0, browser_1.validate)(modifiedConfig, (validationResult) => {
        let configFile = cfg.configFile;
        if (lodash_1.default.isString(validationResult)) {
            return errors_1.default.throwErr('CONFIG_VALIDATION_MSG_ERROR', 'configFile', configFile, validationResult);
        }
        return errors_1.default.throwErr('CONFIG_VALIDATION_ERROR', 'configFile', configFile, validationResult);
    }, testingType);
    debug('validate that there is no breaking config options added by setupNodeEvents');
    function makeSetupError(cyError) {
        cyError.name = `Error running ${testingType}.setupNodeEvents()`;
        return cyError;
    }
    (0, browser_1.validateNoBreakingConfig)(modifiedConfig, errors_1.default.warning, (err, options) => {
        throw makeSetupError(errors_1.default.get(err, options));
    }, testingType);
    (0, browser_1.validateNoBreakingConfig)(modifiedConfig[testingType], errors_1.default.warning, (err, options) => {
        throw makeSetupError(errors_1.default.get(err, {
            ...options,
            name: `${testingType}.${options.name}`,
        }));
    }, testingType);
    const originalResolvedBrowsers = (_b = lodash_1.default.cloneDeep((_a = cfg === null || cfg === void 0 ? void 0 : cfg.resolved) === null || _a === void 0 ? void 0 : _a.browsers)) !== null && _b !== void 0 ? _b : {
        value: cfg.browsers,
        from: 'default',
    };
    const diffs = (0, return_deep_diff_1.default)(cfg, modifiedConfig, true);
    debug('config diffs %o', diffs);
    const userBrowserList = diffs && diffs.browsers && lodash_1.default.cloneDeep(diffs.browsers);
    if (userBrowserList) {
        debug('user browser list %o', userBrowserList);
    }
    // for each override go through
    // and change the resolved values of cfg
    // to point to the plugin
    if (diffs) {
        debug('resolved config before diffs %o', cfg.resolved);
        (0, utils_1.setPluginResolvedOn)(cfg.resolved, diffs);
        debug('resolved config object %o', cfg.resolved);
    }
    // merge cfg into overrides
    const merged = lodash_1.default.defaultsDeep(diffs, cfg);
    debug('merged config object %o', merged);
    // the above _.defaultsDeep combines arrays,
    // if diffs.browsers = [1] and cfg.browsers = [1, 2]
    // then the merged result merged.browsers = [1, 2]
    // which is NOT what we want
    if (Array.isArray(userBrowserList) && userBrowserList.length) {
        merged.browsers = userBrowserList;
        merged.resolved.browsers.value = userBrowserList;
    }
    if (modifiedConfig.browsers === null) {
        // null breaks everything when merging lists
        debug('replacing null browsers with original list %o', originalResolvedBrowsers);
        merged.browsers = cfg.browsers;
        if (originalResolvedBrowsers) {
            merged.resolved.browsers = originalResolvedBrowsers;
        }
    }
    debug('merged plugins config %o', merged);
    return merged;
}
exports.updateWithPluginValues = updateWithPluginValues;
