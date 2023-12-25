"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkIfResolveChangedRootFolder = exports.mergeDefaults = exports.setSupportFileAndFolder = exports.relativeToProjectRoot = exports.setNodeBinary = exports.setAbsolutePaths = exports.setPluginResolvedOn = exports.resolveConfigValues = exports.parseEnv = exports.CYPRESS_SPECIAL_ENV_VARS = exports.CYPRESS_RESERVED_ENV_VARS = exports.utils = void 0;
const tslib_1 = require("tslib");
const bluebird_1 = tslib_1.__importDefault(require("bluebird"));
const debug_1 = tslib_1.__importDefault(require("debug"));
const fs_extra_1 = tslib_1.__importDefault(require("fs-extra"));
const lodash_1 = tslib_1.__importDefault(require("lodash"));
const path_1 = tslib_1.__importDefault(require("path"));
const errors_1 = tslib_1.__importDefault(require(process.argv[1]+"/../packages/errors"));
const browser_1 = require("../browser");
const utils_1 = require("../utils");
const options_1 = require("../options");
const debug = (0, debug_1.default)('cypress:config:project:utils');
const hideSpecialVals = function (val, key) {
    if (lodash_1.default.includes(exports.CYPRESS_SPECIAL_ENV_VARS, key)) {
        return (0, utils_1.hideKeys)(val);
    }
    return val;
};
// an object with a few utility methods for easy stubbing from unit tests
exports.utils = {
    getProcessEnvVars(obj) {
        return lodash_1.default.reduce(obj, (memo, value, key) => {
            if (!value) {
                return memo;
            }
            if (isCypressEnvLike(key)) {
                memo[removeEnvPrefix(key)] = (0, utils_1.coerce)(value);
            }
            return memo;
        }, {});
    },
    resolveModule(name) {
        return require.resolve(name);
    },
    // returns:
    //   false - if the file should not be set
    //   string - found filename
    //   null - if there is an error finding the file
    discoverModuleFile(options) {
        debug('discover module file %o', options);
        const { filename } = options;
        // they have it explicitly set, so it should be there
        return fs_extra_1.default.pathExists(filename)
            .then((found) => {
            if (found) {
                debug('file exists, assuming it will load');
                return filename;
            }
            debug('could not find %o', { filename });
            return null;
        });
    },
};
const CYPRESS_ENV_PREFIX = 'CYPRESS_';
const CYPRESS_ENV_PREFIX_LENGTH = CYPRESS_ENV_PREFIX.length;
exports.CYPRESS_RESERVED_ENV_VARS = [
    'CYPRESS_INTERNAL_ENV',
];
exports.CYPRESS_SPECIAL_ENV_VARS = [
    'RECORD_KEY',
];
const isCypressEnvLike = (key) => {
    return lodash_1.default.chain(key)
        .invoke('toUpperCase')
        .startsWith(CYPRESS_ENV_PREFIX)
        .value() &&
        !lodash_1.default.includes(exports.CYPRESS_RESERVED_ENV_VARS, key);
};
const removeEnvPrefix = (key) => {
    return key.slice(CYPRESS_ENV_PREFIX_LENGTH);
};
function parseEnv(cfg, cliEnvs, resolved = {}) {
    const envVars = (resolved.env = {});
    const resolveFrom = (from, obj = {}) => {
        return lodash_1.default.each(obj, (val, key) => {
            return envVars[key] = {
                value: val,
                from,
            };
        });
    };
    const configEnv = cfg.env != null ? cfg.env : {};
    const envFile = cfg.envFile != null ? cfg.envFile : {};
    let processEnvs = exports.utils.getProcessEnvVars(process.env) || {};
    cliEnvs = cliEnvs != null ? cliEnvs : {};
    const configFromEnv = lodash_1.default.reduce(processEnvs, (memo, val, key) => {
        const cfgKey = (0, browser_1.matchesConfigKey)(key);
        if (cfgKey) {
            // only change the value if it hasn't been
            // set by the CLI. override default + config
            if (resolved[cfgKey] !== 'cli') {
                cfg[cfgKey] = val;
                resolved[cfgKey] = {
                    value: val,
                    from: 'env',
                };
            }
            memo.push(key);
        }
        return memo;
    }, []);
    processEnvs = lodash_1.default.chain(processEnvs)
        .omit(configFromEnv)
        .mapValues(hideSpecialVals)
        .value();
    resolveFrom('config', configEnv);
    resolveFrom('envFile', envFile);
    resolveFrom('env', processEnvs);
    resolveFrom('cli', cliEnvs);
    // configEnvs is from cypress.config.{js,ts,mjs,cjs}
    // envFile is from cypress.env.json
    // processEnvs is from process env vars
    // cliEnvs is from CLI arguments
    return lodash_1.default.extend(configEnv, envFile, processEnvs, cliEnvs);
}
exports.parseEnv = parseEnv;
// combines the default configuration object with values specified in the
// configuration file like "cypress.{ts|js}". Values in configuration file
// overwrite the defaults.
function resolveConfigValues(config, defaults, resolved = {}) {
    // pick out only known configuration keys
    return lodash_1.default
        .chain(config)
        .pick((0, browser_1.getPublicConfigKeys)())
        .mapValues((val, key) => {
        const source = (s) => {
            return {
                value: val,
                from: s,
            };
        };
        const r = resolved[key];
        if (r) {
            if (lodash_1.default.isObject(r)) {
                return r;
            }
            return source(r);
        }
        if (lodash_1.default.isEqual(config[key], defaults[key]) || key === 'browsers') {
            // "browsers" list is special, since it is dynamic by default
            // and can only be overwritten via plugins file
            return source('default');
        }
        return source('config');
    })
        .value();
}
exports.resolveConfigValues = resolveConfigValues;
// Given an object "resolvedObj" and a list of overrides in "obj"
// marks all properties from "obj" inside "resolvedObj" using
// {value: obj.val, from: "plugin"}
function setPluginResolvedOn(resolvedObj, obj) {
    return lodash_1.default.each(obj, (val, key) => {
        if (lodash_1.default.isObject(val) && !lodash_1.default.isArray(val) && resolvedObj[key]) {
            // recurse setting overrides
            // inside of objected
            return setPluginResolvedOn(resolvedObj[key], val);
        }
        const valueFrom = {
            value: val,
            from: 'plugin',
        };
        resolvedObj[key] = valueFrom;
    });
}
exports.setPluginResolvedOn = setPluginResolvedOn;
function setAbsolutePaths(obj) {
    obj = lodash_1.default.clone(obj);
    // if we have a projectRoot
    const pr = obj.projectRoot;
    if (pr) {
        // reset fileServerFolder to be absolute
        // obj.fileServerFolder = path.resolve(pr, obj.fileServerFolder)
        // and do the same for all the rest
        lodash_1.default.extend(obj, convertRelativeToAbsolutePaths(pr, obj));
    }
    return obj;
}
exports.setAbsolutePaths = setAbsolutePaths;
const folders = (0, lodash_1.default)(options_1.options).filter({ isFolder: true }).map('name').value();
const convertRelativeToAbsolutePaths = (projectRoot, obj) => {
    return lodash_1.default.reduce(folders, (memo, folder) => {
        const val = obj[folder];
        if ((val != null) && (val !== false)) {
            memo[folder] = path_1.default.resolve(projectRoot, val);
        }
        return memo;
    }, {});
};
// instead of the built-in Node process, specify a path to 3rd party Node
const setNodeBinary = (obj, userNodePath, userNodeVersion) => {
    // if execPath isn't found we weren't executed from the CLI and should used the bundled node version.
    if (userNodePath && userNodeVersion) {
        obj.resolvedNodePath = userNodePath;
        obj.resolvedNodeVersion = userNodeVersion;
        return obj;
    }
    obj.resolvedNodeVersion = process.versions.node;
    return obj;
};
exports.setNodeBinary = setNodeBinary;
function relativeToProjectRoot(projectRoot, file) {
    if (!file.startsWith(projectRoot)) {
        return file;
    }
    // captures leading slash(es), both forward slash and back slash
    const leadingSlashRe = /^[\/|\\]*(?![\/|\\])/;
    return file.replace(projectRoot, '').replace(leadingSlashRe, '');
}
exports.relativeToProjectRoot = relativeToProjectRoot;
// async function
async function setSupportFileAndFolder(obj, getFilesByGlob) {
    if (!obj.supportFile) {
        return bluebird_1.default.resolve(obj);
    }
    obj = lodash_1.default.clone(obj);
    const supportFilesByGlob = await getFilesByGlob(obj.projectRoot, obj.supportFile);
    if (supportFilesByGlob.length > 1) {
        return errors_1.default.throwErr('MULTIPLE_SUPPORT_FILES_FOUND', obj.supportFile, supportFilesByGlob);
    }
    if (supportFilesByGlob.length === 0) {
        if (obj.resolved.supportFile.from === 'default') {
            return errors_1.default.throwErr('DEFAULT_SUPPORT_FILE_NOT_FOUND', relativeToProjectRoot(obj.projectRoot, obj.supportFile));
        }
        return errors_1.default.throwErr('SUPPORT_FILE_NOT_FOUND', relativeToProjectRoot(obj.projectRoot, obj.supportFile));
    }
    // TODO move this logic to find support file into util/path_helpers
    const sf = supportFilesByGlob[0];
    debug(`setting support file ${sf}`);
    debug(`for project root ${obj.projectRoot}`);
    return bluebird_1.default
        .try(() => {
        // resolve full path with extension
        obj.supportFile = exports.utils.resolveModule(sf);
        return debug('resolved support file %s', obj.supportFile);
    }).then(() => {
        if (!(0, exports.checkIfResolveChangedRootFolder)(obj.supportFile, sf)) {
            return;
        }
        debug('require.resolve switched support folder from %s to %s', sf, obj.supportFile);
        // this means the path was probably symlinked, like
        // /tmp/foo -> /private/tmp/foo
        // which can confuse the rest of the code
        // switch it back to "normal" file
        const supportFileName = path_1.default.basename(obj.supportFile);
        const base = (sf === null || sf === void 0 ? void 0 : sf.endsWith(supportFileName)) ? path_1.default.dirname(sf) : sf;
        obj.supportFile = path_1.default.join(base || '', supportFileName);
        return fs_extra_1.default.pathExists(obj.supportFile)
            .then((found) => {
            if (!found) {
                errors_1.default.throwErr('SUPPORT_FILE_NOT_FOUND', relativeToProjectRoot(obj.projectRoot, obj.supportFile));
            }
            return debug('switching to found file %s', obj.supportFile);
        });
    }).catch({ code: 'MODULE_NOT_FOUND' }, () => {
        debug('support JS module %s does not load', sf);
        return exports.utils.discoverModuleFile({
            filename: sf,
            projectRoot: obj.projectRoot,
        })
            .then((result) => {
            if (result === null) {
                return errors_1.default.throwErr('SUPPORT_FILE_NOT_FOUND', relativeToProjectRoot(obj.projectRoot, sf));
            }
            debug('setting support file to %o', { result });
            obj.supportFile = result;
            return obj;
        });
    })
        .then(() => {
        if (obj.supportFile) {
            // set config.supportFolder to its directory
            obj.supportFolder = path_1.default.dirname(obj.supportFile);
            debug(`set support folder ${obj.supportFolder}`);
        }
        return obj;
    });
}
exports.setSupportFileAndFolder = setSupportFileAndFolder;
function mergeDefaults(config = {}, options = {}, cliConfig = {}, getFilesByGlob) {
    const resolved = {};
    const { testingType } = options;
    config.rawJson = lodash_1.default.cloneDeep(config);
    lodash_1.default.extend(config, lodash_1.default.pick(options, 'configFile', 'morgan', 'isTextTerminal', 'socketId', 'report', 'browsers'));
    debug('merged config with options, got %o', config);
    lodash_1.default
        .chain((0, browser_1.allowed)({ ...cliConfig, ...options }))
        .omit('env')
        .omit('browsers')
        .each((val, key) => {
        // If users pass in testing-type specific keys (eg, specPattern),
        // we want to merge this with what we've read from the config file,
        // rather than override it entirely.
        if (typeof config[key] === 'object' && typeof val === 'object') {
            if (Object.keys(val).length) {
                resolved[key] = 'cli';
                config[key] = { ...config[key], ...val };
            }
        }
        else {
            resolved[key] = 'cli';
            config[key] = val;
        }
    }).value();
    let url = config.baseUrl;
    if (url) {
        // replace multiple slashes at the end of string to single slash
        // so http://localhost/// will be http://localhost/
        // https://regexr.com/48rvt
        config.baseUrl = url.replace(/\/\/+$/, '/');
    }
    const defaultsForRuntime = (0, browser_1.getDefaultValues)({
        ...options,
    });
    lodash_1.default.defaultsDeep(config, defaultsForRuntime);
    let additionalIgnorePattern = config.additionalIgnorePattern;
    if (testingType === 'component' && config.e2e && config.e2e.specPattern) {
        additionalIgnorePattern = config.e2e.specPattern;
    }
    config = {
        ...config,
        ...config[testingType],
        additionalIgnorePattern,
    };
    // split out our own app wide env from user env variables
    // and delete envFile
    config.env = parseEnv(config, { ...cliConfig.env, ...options.env }, resolved);
    config.cypressEnv = process.env.CYPRESS_INTERNAL_ENV;
    debug('using CYPRESS_INTERNAL_ENV %s', config.cypressEnv);
    if (!isValidCypressInternalEnvValue(config.cypressEnv)) {
        throw errors_1.default.throwErr('INVALID_CYPRESS_INTERNAL_ENV', config.cypressEnv);
    }
    delete config.envFile;
    // when headless
    if (config.isTextTerminal && !process.env.CYPRESS_INTERNAL_FORCE_FILEWATCH) {
        // dont ever watch for file changes
        config.watchForFileChanges = false;
        // and forcibly reset numTestsKeptInMemory
        // to zero
        config.numTestsKeptInMemory = 0;
    }
    config = setResolvedConfigValues(config, defaultsForRuntime, resolved);
    if (config.port) {
        config = (0, utils_1.setUrls)(config);
    }
    // validate config again here so that we catch configuration errors coming
    // from the CLI overrides or env var overrides
    (0, browser_1.validate)(lodash_1.default.omit(config, 'browsers'), (validationResult) => {
        // return errors.throwErr('CONFIG_VALIDATION_ERROR', errMsg)
        if (lodash_1.default.isString(validationResult)) {
            return errors_1.default.throwErr('CONFIG_VALIDATION_MSG_ERROR', null, null, validationResult);
        }
        return errors_1.default.throwErr('CONFIG_VALIDATION_ERROR', null, null, validationResult);
    }, testingType);
    config = setAbsolutePaths(config);
    config = (0, exports.setNodeBinary)(config, options.userNodePath, options.userNodeVersion);
    debug('validate that there is no breaking config options before setupNodeEvents');
    function makeConfigError(cyError) {
        cyError.name = `Obsolete option used in config object`;
        return cyError;
    }
    (0, browser_1.validateNoBreakingConfig)(config[testingType], errors_1.default.warning, (err, options) => {
        throw makeConfigError(errors_1.default.get(err, { ...options, name: `${testingType}.${options.name}` }));
    }, testingType);
    (0, browser_1.validateNoBreakingConfig)(config, errors_1.default.warning, (err, ...args) => {
        throw makeConfigError(errors_1.default.get(err, ...args));
    }, testingType);
    // We need to remove the nested propertied by testing type because it has been
    // flattened/compacted based on the current testing type that is selected
    // making the config only available with the properties that are valid,
    // also, having the correct values that can be used in the setupNodeEvents
    delete config['e2e'];
    delete config['component'];
    delete config['resolved']['e2e'];
    delete config['resolved']['component'];
    return setSupportFileAndFolder(config, getFilesByGlob);
}
exports.mergeDefaults = mergeDefaults;
function isValidCypressInternalEnvValue(value) {
    // names of config environments, see "config/app.json"
    const names = ['development', 'test', 'staging', 'production'];
    return lodash_1.default.includes(names, value);
}
function setResolvedConfigValues(config, defaults, resolved) {
    const obj = lodash_1.default.clone(config);
    obj.resolved = resolveConfigValues(config, defaults, resolved);
    debug('resolved config is %o', obj.resolved.browsers);
    return obj;
}
// require.resolve walks the symlinks, which can really change
// the results. For example
//  /tmp/foo is symlink to /private/tmp/foo on Mac
// thus resolving /tmp/foo to find /tmp/foo/index.js
// can return /private/tmp/foo/index.js
// which can really confuse the rest of the code.
// Detect this switch by checking if the resolution of absolute
// paths moved the prefix
//
// Good case: no switcheroo, return false
//   /foo/bar -> /foo/bar/index.js
// Bad case: return true
//   /tmp/foo/bar -> /private/tmp/foo/bar/index.js
const checkIfResolveChangedRootFolder = (resolved, initial) => {
    return path_1.default.isAbsolute(resolved) &&
        path_1.default.isAbsolute(initial) &&
        !resolved.startsWith(initial);
};
exports.checkIfResolveChangedRootFolder = checkIfResolveChangedRootFolder;
