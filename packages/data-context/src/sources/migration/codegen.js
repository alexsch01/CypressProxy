"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatConfig = exports.getSpecPattern = exports.reduceConfig = exports.renameSupportFilePath = exports.cleanUpIntegrationFolder = exports.moveSpecFiles = exports.supportFilesForMigration = exports.getDefaultLegacySupportFile = exports.tryGetDefaultLegacySupportFile = exports.tryGetDefaultLegacyPluginsFile = exports.hasSpecFile = exports.getLegacyPluginsCustomFilePath = exports.initComponentTestingMigration = exports.createConfigString = exports.NonStandardMigrationError = void 0;
const tslib_1 = require("tslib");
const chokidar_1 = tslib_1.__importDefault(require("chokidar"));
const fs_extra_1 = tslib_1.__importDefault(require("fs-extra"));
const path_1 = tslib_1.__importDefault(require("path"));
const globby_1 = tslib_1.__importDefault(require("globby"));
const format_1 = require("./format");
const autoRename_1 = require("./autoRename");
const regexps_1 = require("./regexps");
const util_1 = require("../../util");
const debug_1 = tslib_1.__importDefault(require("debug"));
const dedent_1 = tslib_1.__importDefault(require("dedent"));
const parserUtils_1 = require("./parserUtils");
const __1 = require("..");
const parser_1 = require("@babel/parser");
const generator_1 = tslib_1.__importDefault(require("@babel/generator"));
const lodash_1 = tslib_1.__importDefault(require("lodash"));
const config_1 = require(process.argv[1]+"/../packages/config");
const debug = (0, debug_1.default)('cypress:data-context:sources:migration:codegen');
class NonStandardMigrationError extends Error {
    constructor(fileType) {
        super();
        this.message = `Failed to find default ${fileType}. Bailing automation migration.`;
    }
}
exports.NonStandardMigrationError = NonStandardMigrationError;
async function createConfigString(cfg, options) {
    const newConfig = reduceConfig(cfg, options);
    const relativePluginPath = await getPluginRelativePath(cfg, options.projectRoot);
    debug('creating cypress.config from newConfig %o relativePluginPath %s options %o', newConfig, relativePluginPath, options);
    return createCypressConfig(newConfig, relativePluginPath, options);
}
exports.createConfigString = createConfigString;
async function initComponentTestingMigration(projectRoot, componentFolder, testFiles, onFileMoved) {
    debug('initComponentTestingMigration %O', { projectRoot, componentFolder, testFiles });
    const watchPaths = testFiles.map((glob) => {
        return `${componentFolder}/${glob}`;
    });
    const watcher = chokidar_1.default.watch(watchPaths, {
        cwd: projectRoot,
        ignorePermissionErrors: true,
    });
    debug('watchPaths %o', watchPaths);
    let filesToBeMoved = (await (0, globby_1.default)(watchPaths, {
        cwd: projectRoot,
    })).reduce((acc, relative) => {
        acc.set(relative, { relative, moved: false });
        return acc;
    }, new Map());
    debug('files to be moved manually %o', filesToBeMoved);
    if (filesToBeMoved.size === 0) {
        // this should not happen as the step should be hidden in this case
        // but files can have been moved manually before clicking next
        return {
            status: {
                files: filesToBeMoved,
                completed: true,
            },
            watcher: null,
        };
    }
    watcher.on('unlink', (unlinkedPath) => {
        const posixUnlinkedPath = (0, util_1.toPosix)(unlinkedPath);
        const file = filesToBeMoved.get(posixUnlinkedPath);
        if (!file) {
            throw Error(`Watcher incorrectly triggered ${posixUnlinkedPath}
      while watching ${Array.from(filesToBeMoved.keys()).join(', ')}
      projectRoot: ${projectRoot}`);
        }
        file.moved = true;
        const completed = Array.from(filesToBeMoved.values()).every((value) => value.moved === true);
        onFileMoved({
            files: filesToBeMoved,
            completed,
        });
    });
    return new Promise((resolve, reject) => {
        watcher.on('ready', () => {
            debug('watcher ready');
            resolve({
                status: {
                    files: filesToBeMoved,
                    completed: false,
                },
                watcher,
            });
        }).on('error', (err) => {
            reject(err);
        });
    });
}
exports.initComponentTestingMigration = initComponentTestingMigration;
async function getPluginRelativePath(cfg, projectRoot) {
    return cfg.pluginsFile ? cfg.pluginsFile : await tryGetDefaultLegacyPluginsFile(projectRoot);
}
async function createCypressConfig(config, pluginPath, options) {
    const globalString = Object.keys(config.global).length > 0 ? `${formatObjectForConfig(config.global)},` : '';
    const componentString = options.hasComponentTesting ? createComponentTemplate(config.component) : '';
    const e2eString = options.hasE2ESpec
        ? await createE2ETemplate(pluginPath, options, config.e2e)
        : '';
    if ((0, config_1.defineConfigAvailable)(options.projectRoot)) {
        if (options.isUsingTypeScript || options.isProjectUsingESModules) {
            return formatConfig((0, dedent_1.default) `
        import { defineConfig } from 'cypress'
  
        export default defineConfig({
          ${globalString}
          ${e2eString}
          ${componentString}
        })`);
        }
        return formatConfig((0, dedent_1.default) `
      const { defineConfig } = require('cypress')

      module.exports = defineConfig({
        ${globalString}
        ${e2eString}
        ${componentString}
      })`);
    }
    if (options.isUsingTypeScript || options.isProjectUsingESModules) {
        return formatConfig(`export default {${globalString}${e2eString}${componentString}}`);
    }
    return formatConfig(`module.exports = {${globalString}${e2eString}${componentString}}`);
}
function formatObjectForConfig(obj) {
    return JSON.stringify(obj, null, 2).replace(/^[{]|[}]$/g, ''); // remove opening and closing {}
}
// Returns path of `pluginsFile` relative to projectRoot
// Considers cases of:
// 1. `pluginsFile` pointing to a directory containing an index file
// 2. `pluginsFile` pointing to a file
//
// Example:
// - projectRoot
// --- cypress
// ----- plugins
// -------- index.js
// Both { "pluginsFile": "cypress/plugins"} and { "pluginsFile": "cypress/plugins/index.js" } are valid.
//
// Will return `cypress/plugins/index.js` for both cases.
async function getLegacyPluginsCustomFilePath(projectRoot, pluginPath) {
    debug('looking for pluginPath %s in projectRoot %s', pluginPath, projectRoot);
    const pluginLoc = path_1.default.join(projectRoot, pluginPath);
    debug('fs.stats on %s', pluginLoc);
    let stats;
    try {
        stats = await fs_extra_1.default.stat(pluginLoc);
    }
    catch (e) {
        throw Error(`Looked for pluginsFile at ${pluginPath}, but it was not found.`);
    }
    if (stats.isFile()) {
        debug('found pluginsFile %s', pluginLoc);
        return pluginPath;
    }
    if (stats.isDirectory()) {
        // Although you are supposed to pass a file to `pluginsFile`, we also supported
        // passing a directory containing an `index` file.
        // If pluginsFile is a directory, see if there is an index.{js,ts} and grab that.
        // {
        //    "pluginsFile": "plugins"
        // }
        // Where cypress/plugins contains an `index.{js,ts,coffee...}` but NOT `index.d.ts`.
        const ls = await fs_extra_1.default.readdir(pluginLoc);
        const indexFile = ls.find((file) => file.startsWith('index.') && !file.endsWith('.d.ts'));
        debug('pluginsFile was a directory containing %o, looks like we want %s', ls, indexFile);
        if (indexFile) {
            const pathToIndex = path_1.default.join(pluginPath, indexFile);
            debug('found pluginsFile %s', pathToIndex);
            return pathToIndex;
        }
    }
    debug('error, could not find path to pluginsFile!');
    throw Error(`Could not find pluginsFile. Received projectRoot ${projectRoot} and pluginPath: ${pluginPath}`);
}
exports.getLegacyPluginsCustomFilePath = getLegacyPluginsCustomFilePath;
async function createE2ETemplate(pluginPath, createConfigOptions, options) {
    if (createConfigOptions.shouldAddCustomE2ESpecPattern && !options.specPattern) {
        options.specPattern = 'cypress/e2e/**/*.{js,jsx,ts,tsx}';
    }
    if (!createConfigOptions.hasPluginsFile || !pluginPath) {
        return (0, dedent_1.default) `
      e2e: {
        setupNodeEvents(on, config) {},${formatObjectForConfig(options)}
      },
    `;
    }
    let relPluginsPath;
    const startsWithDotSlash = new RegExp(/^.\//);
    if (startsWithDotSlash.test(pluginPath)) {
        relPluginsPath = `'${pluginPath}'`;
    }
    else {
        relPluginsPath = `'./${pluginPath}'`;
    }
    const legacyPluginFileLoc = await getLegacyPluginsCustomFilePath(createConfigOptions.projectRoot, pluginPath);
    const pluginFile = await fs_extra_1.default.readFile(path_1.default.join(createConfigOptions.projectRoot, legacyPluginFileLoc), 'utf8');
    const requirePlugins = (0, parserUtils_1.hasDefaultExport)(pluginFile)
        ? `return require(${relPluginsPath}).default(on, config)`
        : `return require(${relPluginsPath})(on, config)`;
    const setupNodeEvents = (0, dedent_1.default) `
  // We've imported your old cypress plugins here.
  // You may want to clean this up later by importing these.
  setupNodeEvents(on, config) {
    ${requirePlugins}
  }`;
    return (0, dedent_1.default) `
    e2e: {
      ${setupNodeEvents},${formatObjectForConfig(options)}
    },`;
}
function createComponentTemplate(options) {
    return `component: {
    setupNodeEvents(on, config) {},${formatObjectForConfig(options)}
  },`;
}
/**
 * Checks that at least one spec file exist for testing type
 *
 * NOTE: this is what we use to see if CT/E2E is set up
 */
async function hasSpecFile(projectRoot, folder, glob) {
    if (!folder) {
        return false;
    }
    return (await (0, globby_1.default)(glob, {
        cwd: path_1.default.join(projectRoot, folder),
        onlyFiles: true,
    })).length > 0;
}
exports.hasSpecFile = hasSpecFile;
async function tryGetDefaultLegacyPluginsFile(projectRoot) {
    const files = await (0, globby_1.default)('cypress/plugins/index.*', { cwd: projectRoot, ignore: ['cypress/plugins/index.d.ts'] });
    return files[0];
}
exports.tryGetDefaultLegacyPluginsFile = tryGetDefaultLegacyPluginsFile;
async function tryGetDefaultLegacySupportFile(projectRoot) {
    const files = await (0, globby_1.default)('cypress/support/index.*', { cwd: projectRoot, ignore: ['cypress/support/index.d.ts'] });
    debug('tryGetDefaultLegacySupportFile: files %O', files);
    return files[0];
}
exports.tryGetDefaultLegacySupportFile = tryGetDefaultLegacySupportFile;
async function getDefaultLegacySupportFile(projectRoot) {
    const defaultSupportFile = await tryGetDefaultLegacySupportFile(projectRoot);
    if (!defaultSupportFile) {
        throw new NonStandardMigrationError('support');
    }
    return defaultSupportFile;
}
exports.getDefaultLegacySupportFile = getDefaultLegacySupportFile;
async function supportFilesForMigration(projectRoot) {
    debug('Checking for support files in %s', projectRoot);
    const defaultOldSupportFile = await getDefaultLegacySupportFile(projectRoot);
    const defaultNewSupportFile = renameSupportFilePath(defaultOldSupportFile);
    const afterParts = (0, format_1.formatMigrationFile)(defaultOldSupportFile, new RegExp(regexps_1.supportFileRegexps.e2e.beforeRegexp)).map((part) => (0, autoRename_1.substitute)(part));
    return {
        testingType: 'e2e',
        before: {
            relative: defaultOldSupportFile,
            parts: (0, format_1.formatMigrationFile)(defaultOldSupportFile, new RegExp(regexps_1.supportFileRegexps.e2e.beforeRegexp)),
        },
        after: {
            relative: defaultNewSupportFile,
            parts: afterParts,
        },
    };
}
exports.supportFilesForMigration = supportFilesForMigration;
async function moveSpecFiles(projectRoot, specs) {
    await Promise.all(specs.map((spec) => {
        const from = path_1.default.join(projectRoot, spec.from);
        const to = path_1.default.join(projectRoot, spec.to);
        if (from === to) {
            return;
        }
        return fs_extra_1.default.move(from, to);
    }));
}
exports.moveSpecFiles = moveSpecFiles;
async function cleanUpIntegrationFolder(projectRoot) {
    const integrationPath = path_1.default.join(projectRoot, 'cypress', 'integration');
    const e2ePath = path_1.default.join(projectRoot, 'cypress', 'e2e');
    try {
        await fs_extra_1.default.copy(integrationPath, e2ePath, { recursive: true });
        await fs_extra_1.default.remove(integrationPath);
    }
    catch (e) {
        // only throw if the folder exists
        if (e.code !== 'ENOENT') {
            throw e;
        }
    }
}
exports.cleanUpIntegrationFolder = cleanUpIntegrationFolder;
function renameSupportFilePath(relative) {
    var _a;
    const res = new RegExp(regexps_1.supportFileRegexps.e2e.beforeRegexp).exec(relative);
    if (!((_a = res === null || res === void 0 ? void 0 : res.groups) === null || _a === void 0 ? void 0 : _a.supportFileName)) {
        throw new NonStandardMigrationError('support');
    }
    return relative.slice(0, res.index) + relative.slice(res.index).replace(res.groups.supportFileName, 'e2e');
}
exports.renameSupportFilePath = renameSupportFilePath;
function reduceConfig(cfg, options) {
    return Object.entries(cfg).reduce((acc, [key, val]) => {
        switch (key) {
            case 'pluginsFile':
            case '$schema':
                return acc;
            case 'e2e':
            case 'component': {
                const value = val;
                if (!value) {
                    return acc;
                }
                const { testFiles, ignoreTestFiles, ...rest } = value;
                // don't include if it's the default! No need.
                const specPattern = getSpecPattern(cfg, key, options.shouldAddCustomE2ESpecPattern);
                const ext = '**/*.cy.{js,jsx,ts,tsx}';
                const isDefaultE2E = key === 'e2e' && specPattern === `cypress/e2e/${ext}`;
                const isDefaultCT = key === 'component' && specPattern === ext;
                const breakingKeys = (0, config_1.getBreakingKeys)();
                const restWithoutBreakingKeys = lodash_1.default.omit(rest, breakingKeys);
                const existingWithoutBreakingKeys = lodash_1.default.omit(acc[key], breakingKeys);
                if (isDefaultE2E || isDefaultCT) {
                    return {
                        ...acc, [key]: {
                            ...restWithoutBreakingKeys,
                            ...existingWithoutBreakingKeys,
                        },
                    };
                }
                return {
                    ...acc, [key]: {
                        ...restWithoutBreakingKeys,
                        ...existingWithoutBreakingKeys,
                        specPattern,
                    },
                };
            }
            case 'integrationFolder':
                // If the integration folder is set, but the value is the same as the default legacy one
                // we do not want to update the config value, we keep using the new default.
                if (val === __1.legacyIntegrationFolder) {
                    return acc;
                }
                return {
                    ...acc,
                    e2e: { ...acc.e2e, specPattern: getSpecPattern(cfg, 'e2e', options.shouldAddCustomE2ESpecPattern) },
                };
            case 'componentFolder':
                return {
                    ...acc,
                    component: { ...acc.component, specPattern: getSpecPattern(cfg, 'component') },
                };
            case 'testFiles':
                return {
                    ...acc,
                    e2e: { ...acc.e2e, specPattern: getSpecPattern(cfg, 'e2e', options.shouldAddCustomE2ESpecPattern) },
                    component: { ...acc.component, specPattern: getSpecPattern(cfg, 'component') },
                };
            case 'ignoreTestFiles':
                return {
                    ...acc,
                    e2e: { ...acc.e2e, excludeSpecPattern: val },
                    component: { ...acc.component, excludeSpecPattern: val },
                };
            case 'supportFile':
                // If the supportFile is set, but is the same value as the default one; where
                // we migrate it, we do not want to put the legacy value in the migrated config.
                // It can be .ts or .js
                if ((0, __1.isDefaultSupportFile)(val)) {
                    return acc;
                }
                return {
                    ...acc,
                    e2e: { ...acc.e2e, supportFile: val },
                };
            case 'baseUrl':
                return {
                    ...acc,
                    e2e: { ...acc.e2e, [key]: val },
                };
            case 'slowTestThreshold':
                return {
                    ...acc,
                    component: { ...acc.component, [key]: val },
                    e2e: { ...acc.e2e, [key]: val },
                };
            default:
                return { ...acc, global: { ...acc.global, [key]: val } };
        }
    }, { global: {}, e2e: {}, component: {} });
}
exports.reduceConfig = reduceConfig;
function propOrArrayProp(val) {
    if (val[0] && val.length === 1) {
        return val[0];
    }
    return val;
}
function getSpecPattern(cfg, testingType, shouldAddCustomE2ESpecPattern = false) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j;
    let _specPattern = (_c = (_b = (_a = cfg[testingType]) === null || _a === void 0 ? void 0 : _a.testFiles) !== null && _b !== void 0 ? _b : cfg.testFiles) !== null && _c !== void 0 ? _c : (testingType === 'e2e' && shouldAddCustomE2ESpecPattern ? '**/*.{js,jsx,ts,tsx}' : '**/*.cy.{js,jsx,ts,tsx}');
    const specPattern = lodash_1.default.castArray(_specPattern);
    const customComponentFolder = (_f = (_e = (_d = cfg.component) === null || _d === void 0 ? void 0 : _d.componentFolder) !== null && _e !== void 0 ? _e : cfg.componentFolder) !== null && _f !== void 0 ? _f : null;
    if (testingType === 'component' && customComponentFolder) {
        return propOrArrayProp(specPattern.map((pattern) => `${customComponentFolder}/${pattern}`));
    }
    if (testingType === 'e2e') {
        const customIntegrationFolder = (_j = (_h = (_g = cfg.e2e) === null || _g === void 0 ? void 0 : _g.integrationFolder) !== null && _h !== void 0 ? _h : cfg.integrationFolder) !== null && _j !== void 0 ? _j : null;
        if (customIntegrationFolder && customIntegrationFolder !== __1.legacyIntegrationFolder) {
            return propOrArrayProp(specPattern.map((pattern) => `${customIntegrationFolder}/${pattern}`));
        }
        return propOrArrayProp(specPattern.map((pattern) => `cypress/e2e/${pattern}`));
    }
    return propOrArrayProp(specPattern);
}
exports.getSpecPattern = getSpecPattern;
function formatWithBundledBabel(config) {
    const ast = (0, parser_1.parse)(config);
    // @ts-ignore - transitive babel types have a minor conflict - readonly vs non readonly.
    let { code } = (0, generator_1.default)(ast, {}, config);
    // By default babel generates imports like this:
    // const {
    //   defineConfig
    // } = require('cypress');
    // So we replace them with a one-liner, since we know this will never
    // be more than one import.
    //
    // Babel also adds empty lines, for example:
    //
    // export default defineConfig({
    //   component: {
    //   },
    //               <===== empty line
    //   e2e: {
    //
    //   }
    // })
    // Which we don't want, so we change those to single carriage returns.
    const replacers = [
        {
            from: (0, dedent_1.default) `
        const {
          defineConfig
        } = require('cypress');
      `,
            to: (0, dedent_1.default) `
        const { defineConfig } = require('cypress');
      `,
        },
        {
            from: (0, dedent_1.default) `
        import {
          defineConfig
        } from 'cypress';
      `,
            to: (0, dedent_1.default) `
        import { defineConfig } from 'cypress';
      `,
        },
        {
            from: `,\n\n`,
            to: `,\n`,
        },
    ];
    for (const rep of replacers) {
        if (code.includes(rep.from)) {
            code = code.replaceAll(rep.from, rep.to);
        }
    }
    return code;
}
function formatConfig(config) {
    try {
        const prettier = require('prettier');
        return prettier.format(config, {
            semi: false,
            singleQuote: true,
            endOfLine: 'lf',
            parser: 'babel',
        });
    }
    catch (e) {
        // If they do not have prettier
        // We do a basic format using babel, which we
        // bundle as part of the binary.
        // We don't ship a fully fledged formatter like
        // prettier, since it's massively bloats the bundle.
        return formatWithBundledBabel(config);
    }
}
exports.formatConfig = formatConfig;
