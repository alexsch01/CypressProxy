"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.packherdRequire = void 0;
const tslib_1 = require("tslib");
const debug_1 = tslib_1.__importDefault(require("debug"));
const default_transpile_cache_1 = require("./default-transpile-cache");
const loader_1 = require("./loader");
const path_1 = tslib_1.__importDefault(require("path"));
const logInfo = (0, debug_1.default)('cypress-verbose:packherd:info');
const logDebug = (0, debug_1.default)('cypress-verbose:packherd:debug');
const logTrace = (0, debug_1.default)('cypress-verbose:packherd:trace');
const logError = (0, debug_1.default)('cypress:packherd:error');
tslib_1.__exportStar(require("./loader"), exports);
tslib_1.__exportStar(require("./types"), exports);
const DEFAULT_TRANSPILE_OPTS = {
    supportTS: false,
};
/**
 * Patches Node.js require chain in order to load modules from different sources
 * and/or transpile TypeScript modules on the fly.
 *
 * Hooks into `Module_.load` if either {@link ModuleLoaderOpts} `moduleExports`
 * or `moduleDefinitions` or both are provided.
 * It will then try to load modules from either of those two before falling
 * back to the default Node.js behavior and loading them from the file system.
 *
 * Optionally hooks into `Module._extension` in order to transpile TypeScript files as
 * they are required/imported.
 *
 * @returns a variety of functions which allow to communicate with the loader:
 *
 *   - resolve: function to resolve a module from it's URI
 *   - shouldBypassCache: returns `true` if a cache, i.e. exports embedded in the
 *     snapshot cannot by used
 *   - registerModuleLoad: allows registering modules being loaded even if that
 *     occurs from inside a snapshot
 *  - registerModuleLoad: needs to be called to track loaded modules which is
 *    necessary to determine if cache should be bypassed or not
 *
 * These are used by [v8-snapshot](https://github.com/thlorenz/v8-snapshot)
 * from the `require` embedded in its snapshot, see [custom-require](https://github.com/thlorenz/v8-snapshot/blob/master/src/blueprint/custom-require.js).
 *
 * @category Loader
 */
function packherdRequire(projectBaseDir, opts) {
    var _a, _b;
    const Module = require('module');
    const { supportTS, initTranspileCache, tsconfig } = Object.assign({}, DEFAULT_TRANSPILE_OPTS, opts.transpileOpts);
    const diagnosticsEnabled = (_a = opts.diagnosticsEnabled) !== null && _a !== void 0 ? _a : false;
    const cache = initTranspileCache == null
        ? new default_transpile_cache_1.DefaultTranspileCache()
        : (_b = initTranspileCache(projectBaseDir, {
            // even though we pass `cacheDir` here other end may store the cache wherever it wants
            cacheDir: '/tmp/packherd-cache',
        })) !== null && _b !== void 0 ? _b : new default_transpile_cache_1.DefaultTranspileCache();
    if (supportTS) {
        logInfo('Enabling TS support');
        logDebug({ supportTS, initTranspileCache, tsconfig });
        const { hookTranspileTs } = require('./transpile-ts');
        hookTranspileTs(Module, projectBaseDir, logInfo, diagnosticsEnabled, cache, tsconfig);
    }
    const exportKeysLen = opts.moduleExports != null ? Object.keys(opts.moduleExports).length : 0;
    const definitionKeysLen = opts.moduleDefinitions != null
        ? Object.keys(opts.moduleDefinitions).length
        : 0;
    logInfo('packherd defining %d exports and %d definitions!', exportKeysLen, definitionKeysLen);
    logInfo({ projectBaseDir });
    // Even though packherd is designed to support loading from these caches we
    // also support using it for on the fly TypeScript transpilation only.
    // In that case the necessary extensions hook was applied above and no
    // further work is needed.
    if (exportKeysLen === 0 && definitionKeysLen === 0) {
        logInfo('No moduleExports nor moduleDefinitions provided, not hooking Module._load');
        return { resolve: require.resolve.bind(require) };
    }
    const origLoad = Module._load;
    const moduleLoader = new loader_1.PackherdModuleLoader(Module, origLoad, projectBaseDir, opts);
    //
    // Module._load override
    //
    Module._load = function (moduleUri, parent, isMain) {
        logTrace('Module._load "%s"', moduleUri);
        if (Module.builtinModules.includes(moduleUri)) {
            return origLoad(moduleUri, parent, isMain);
        }
        try {
            const { resolved, origin, exports, fullPath } = moduleLoader.tryLoad(moduleUri, parent, isMain);
            const moduleRelativePath = path_1.default.relative(projectBaseDir, fullPath);
            switch (resolved) {
                case 'module:node':
                case 'module-uri:node':
                case 'module-fullpath:node':
                case 'module-key:node':
                case 'cache:node': {
                    logTrace('Resolved "%s" via %s (%s | %s)', moduleUri, resolved, moduleRelativePath, fullPath);
                    break;
                }
                default:
                // No need to do anything
            }
            switch (origin) {
                case 'Module._load': {
                    logTrace('Loaded "%s" via %s resolved as (%s | %s)', moduleUri, origin, moduleRelativePath, fullPath);
                    break;
                }
                case 'packherd:export':
                case 'packherd:definition': {
                    logTrace('Loaded "%s" via (%s | %s)', moduleUri, origin, resolved);
                    break;
                }
                default:
                // No need to do anything
            }
            return exports;
        }
        catch (err) {
            if (diagnosticsEnabled && !moduleUri.endsWith('hook-require')) {
                logError(err);
            }
            throw err;
        }
    };
    return {
        resolve(uri, opts) {
            return moduleLoader.tryResolve(uri, opts).fullPath;
        },
        shouldBypassCache: moduleLoader.shouldBypassCache.bind(moduleLoader),
        registerModuleLoad: moduleLoader.registerModuleLoad.bind(moduleLoader),
        tryLoad: moduleLoader.tryLoad.bind(moduleLoader),
    };
}
exports.packherdRequire = packherdRequire;
