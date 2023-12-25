"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateNeedToRestartOnChange = exports.validateOverridableAtRunTime = exports.validateNoBreakingTestingTypeConfig = exports.validateNoBreakingConfigLaunchpad = exports.validateNoBreakingConfig = exports.validateNoBreakingConfigRoot = exports.validate = exports.matchesConfigKey = exports.getPublicConfigKeys = exports.getDefaultValues = exports.getBreakingRootKeys = exports.getBreakingKeys = exports.allowed = exports.resetIssuedWarnings = exports.testOverrideLevels = exports.validation = exports.breakingOptions = exports.options = exports.defaultExcludeSpecPattern = exports.defaultSpecPattern = void 0;
const tslib_1 = require("tslib");
const lodash_1 = tslib_1.__importDefault(require("lodash"));
const debug_1 = tslib_1.__importDefault(require("debug"));
const options_1 = require("./options");
Object.defineProperty(exports, "defaultSpecPattern", { enumerable: true, get: function () { return options_1.defaultSpecPattern; } });
Object.defineProperty(exports, "defaultExcludeSpecPattern", { enumerable: true, get: function () { return options_1.defaultExcludeSpecPattern; } });
Object.defineProperty(exports, "options", { enumerable: true, get: function () { return options_1.options; } });
Object.defineProperty(exports, "breakingOptions", { enumerable: true, get: function () { return options_1.breakingOptions; } });
// this export has to be done in 2 lines because of a bug in babel typescript
const validation = tslib_1.__importStar(require("./validation"));
exports.validation = validation;
const debug = (0, debug_1.default)('cypress:config:browser');
const dashesOrUnderscoresRe = /^(_-)+/;
// takes an array and creates an index object of [keyKey]: [valueKey]
function createIndex(arr, keyKey, valueKey, defaultValueFallback) {
    return lodash_1.default.reduce(arr, (memo, item) => {
        if (item[valueKey] !== undefined) {
            memo[item[keyKey]] = item[valueKey];
        }
        else {
            memo[item[keyKey]] = defaultValueFallback;
        }
        return memo;
    }, {});
}
const breakingKeys = lodash_1.default.map(options_1.breakingOptions, 'name');
const defaultValues = createIndex(options_1.options, 'name', 'defaultValue');
const publicConfigKeys = (0, lodash_1.default)(options_1.options).reject({ isInternal: true }).map('name').value();
const validationRules = createIndex(options_1.options, 'name', 'validation');
exports.testOverrideLevels = createIndex(options_1.options, 'name', 'overrideLevel', 'never');
const restartOnChangeOptionsKeys = lodash_1.default.filter(options_1.options, 'requireRestartOnChange');
const issuedWarnings = new Set();
function resetIssuedWarnings() {
    issuedWarnings.clear();
}
exports.resetIssuedWarnings = resetIssuedWarnings;
const validateNoBreakingOptions = (breakingCfgOptions, cfg, onWarning, onErr, testingType) => {
    breakingCfgOptions.forEach(({ name, errorKey, newName, isWarning, value }) => {
        if (lodash_1.default.has(cfg, name)) {
            if (value && cfg[name] !== value) {
                // Bail if a value is specified but the config does not have that value.
                return;
            }
            if (isWarning) {
                if (issuedWarnings.has(errorKey)) {
                    return;
                }
                // avoid re-issuing the same warning more than once
                issuedWarnings.add(errorKey);
                return onWarning(errorKey, {
                    name,
                    newName,
                    value,
                    configFile: cfg.configFile,
                    testingType,
                });
            }
            return onErr(errorKey, {
                name,
                newName,
                value,
                configFile: cfg.configFile,
                testingType,
            });
        }
    });
};
const allowed = (obj = {}) => {
    const propertyNames = publicConfigKeys.concat(breakingKeys);
    return lodash_1.default.pick(obj, propertyNames);
};
exports.allowed = allowed;
const getBreakingKeys = () => {
    return breakingKeys;
};
exports.getBreakingKeys = getBreakingKeys;
const getBreakingRootKeys = () => {
    return options_1.breakingRootOptions;
};
exports.getBreakingRootKeys = getBreakingRootKeys;
const getDefaultValues = (runtimeOptions = {}) => {
    // Default values can be functions, in which case they are evaluated
    // at runtime - for example, slowTestThreshold where the default value
    // varies between e2e and component testing.
    const defaultsForRuntime = lodash_1.default.mapValues(defaultValues, (value) => (typeof value === 'function' ? value(runtimeOptions) : value));
    // As we normalize the config based on the selected testing type, we need
    // to do the same with the default values to resolve those correctly
    return { ...defaultsForRuntime, ...defaultsForRuntime[runtimeOptions.testingType] };
};
exports.getDefaultValues = getDefaultValues;
const getPublicConfigKeys = () => {
    return publicConfigKeys;
};
exports.getPublicConfigKeys = getPublicConfigKeys;
const matchesConfigKey = (key) => {
    if (lodash_1.default.has(defaultValues, key)) {
        return key;
    }
    key = key.toLowerCase().replace(dashesOrUnderscoresRe, '');
    key = lodash_1.default.camelCase(key);
    if (lodash_1.default.has(defaultValues, key)) {
        return key;
    }
    return;
};
exports.matchesConfigKey = matchesConfigKey;
const validate = (cfg, onErr, testingType) => {
    debug('validating configuration', cfg);
    return lodash_1.default.each(cfg, (value, key) => {
        const validationFn = validationRules[key];
        // key has a validation rule & value different from the default
        if (validationFn && value !== defaultValues[key]) {
            const result = validationFn(key, value, {
                // if we are validating the e2e or component-specific configuration values, pass
                // the key testing type as the testing type to ensure correct validation
                testingType: (key === 'e2e' || key === 'component') ? key : testingType,
            });
            if (result !== true) {
                return onErr(result);
            }
        }
    });
};
exports.validate = validate;
const validateNoBreakingConfigRoot = (cfg, onWarning, onErr, testingType) => {
    return validateNoBreakingOptions(options_1.breakingRootOptions, cfg, onWarning, onErr, testingType);
};
exports.validateNoBreakingConfigRoot = validateNoBreakingConfigRoot;
const validateNoBreakingConfig = (cfg, onWarning, onErr, testingType) => {
    return validateNoBreakingOptions(options_1.breakingOptions, cfg, onWarning, onErr, testingType);
};
exports.validateNoBreakingConfig = validateNoBreakingConfig;
const validateNoBreakingConfigLaunchpad = (cfg, onWarning, onErr) => {
    return validateNoBreakingOptions(options_1.breakingOptions.filter((option) => option.showInLaunchpad), cfg, onWarning, onErr);
};
exports.validateNoBreakingConfigLaunchpad = validateNoBreakingConfigLaunchpad;
const validateNoBreakingTestingTypeConfig = (cfg, testingType, onWarning, onErr) => {
    const options = options_1.testingTypeBreakingOptions[testingType];
    return validateNoBreakingOptions(options, cfg, onWarning, onErr, testingType);
};
exports.validateNoBreakingTestingTypeConfig = validateNoBreakingTestingTypeConfig;
const validateOverridableAtRunTime = (config, isSuiteLevelOverride, onErr) => {
    Object.keys(config).some((configKey) => {
        const overrideLevel = exports.testOverrideLevels[configKey];
        if (!overrideLevel) {
            // non-cypress configuration option. skip validation
            return;
        }
        // this is unique validation, not applied to the general cy config.
        // it will be removed when we support defining experimental retries
        // in test config overrides
        // TODO: remove when experimental retry overriding is supported
        if (configKey === 'retries') {
            const experimentalRetryCfgKeys = [
                'experimentalStrategy', 'experimentalOptions',
            ];
            Object.keys(config.retries || {})
                .filter((v) => experimentalRetryCfgKeys.includes(v))
                .forEach((invalidExperimentalCfgOverride) => {
                onErr({
                    invalidConfigKey: `retries.${invalidExperimentalCfgOverride}`,
                    supportedOverrideLevel: 'global_only',
                });
            });
        }
        // TODO: add a hook to ensure valid testing-type configuration is being set at runtime for all configuration values.
        // https://github.com/cypress-io/cypress/issues/24365
        if (overrideLevel === 'never' || (overrideLevel === 'suite' && !isSuiteLevelOverride)) {
            onErr({
                invalidConfigKey: configKey,
                supportedOverrideLevel: overrideLevel,
            });
        }
    });
};
exports.validateOverridableAtRunTime = validateOverridableAtRunTime;
const validateNeedToRestartOnChange = (cachedConfig, updatedConfig) => {
    const restartOnChange = {
        browser: false,
        server: false,
    };
    if (!cachedConfig || !updatedConfig) {
        return restartOnChange;
    }
    const configDiff = lodash_1.default.reduce(cachedConfig, (result, value, key) => lodash_1.default.isEqual(value, updatedConfig[key]) ? result : result.concat(key), []);
    restartOnChangeOptionsKeys.forEach((o) => {
        if (o.requireRestartOnChange && configDiff.includes(o.name)) {
            restartOnChange[o.requireRestartOnChange] = true;
        }
    });
    // devServer property is not part of the options, but we should trigger a server
    // restart if we identify any change
    if (!lodash_1.default.isEqual(cachedConfig.devServer, updatedConfig.devServer)) {
        restartOnChange.server = true;
    }
    return restartOnChange;
};
exports.validateNeedToRestartOnChange = validateNeedToRestartOnChange;
