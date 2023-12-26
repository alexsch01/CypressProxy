"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectLanguage = exports.detectFramework = exports.areAllDepsSatisfied = void 0;
const tslib_1 = require("tslib");
const frameworks_1 = require("./frameworks");
const dependencies_1 = require("./dependencies");
const path_1 = tslib_1.__importDefault(require("path"));
const fs_1 = tslib_1.__importDefault(require("fs"));
const globby_1 = tslib_1.__importDefault(require("globby"));
const debug_1 = tslib_1.__importDefault(require("debug"));
const debug = (0, debug_1.default)('cypress:scaffold-config:detect');
async function areAllDepsSatisfied(projectPath, framework) {
    for (const dep of framework.detectors) {
        const result = await (0, frameworks_1.isDependencyInstalled)(dep, projectPath);
        if (!result.satisfied) {
            return false;
        }
    }
    return true;
}
exports.areAllDepsSatisfied = areAllDepsSatisfied;
// Detect the framework, which can either be a tool like Create React App,
// in which case we just return the framework. The user cannot change the
// bundler.
// If we don't find a specific framework, but we do find a library and/or
// bundler, we return both the framework, which might just be "React",
// and the bundler, which could be Vite.
async function detectFramework(projectPath, frameworks) {
    // first see if it's a template
    for (const framework of frameworks.filter((x) => x.category === 'template')) {
        const hasAllDeps = await areAllDepsSatisfied(projectPath, framework);
        // so far all the templates we support only have 1 bundler,
        // for example CRA only works with webpack,
        // but we want to consider in the future, tools like Nuxt ship
        // both a webpack and vite dev-env.
        // if we support this, we will also need to attempt to infer the dev server of choice.
        if (hasAllDeps && framework.supportedBundlers.length === 1) {
            return {
                framework,
                bundler: framework.supportedBundlers[0],
            };
        }
    }
    // if not a template, they probably just installed/configured on their own.
    for (const library of frameworks.filter((x) => x.category === 'library')) {
        // multiple bundlers supported, eg React works with webpack and Vite.
        // try to infer which one they are using.
        const hasLibrary = await areAllDepsSatisfied(projectPath, library);
        for (const bundler of dependencies_1.WIZARD_BUNDLERS) {
            const detectBundler = await (0, frameworks_1.isDependencyInstalled)(bundler, projectPath);
            if (hasLibrary && detectBundler.satisfied) {
                return {
                    framework: library,
                    bundler: bundler.type,
                };
            }
        }
        if (hasLibrary) {
            // unknown bundler, or we couldn't detect it
            // just return the framework, leave the rest to the user.
            return {
                framework: library,
            };
        }
    }
    return {
        framework: undefined,
        bundler: undefined,
    };
}
exports.detectFramework = detectFramework;
function detectLanguage({ projectRoot, customConfigFile, pkgJson, isMigrating = false }) {
    try {
        if (customConfigFile) {
            debug('Evaluating custom Cypress config file \'%s\'', customConfigFile);
            // .ts, .mts extensions
            if (/\.[m]?ts$/i.test(customConfigFile)) {
                debug('Custom config file is Typescript - using TS');
                return 'ts';
            }
            // .js, .cjs, .mjs extensions
            if (/\.[c|m]?js$/i.test(customConfigFile)) {
                debug('Custom config file is Javascript - using JS');
                return 'js';
            }
            debug('Unable to determine language from custom Cypress config file extension');
        }
        debug('Checking for default Cypress config file');
        for (let extension of ['ts', 'mts']) {
            if (fs_1.default.existsSync(path_1.default.join(projectRoot, `cypress.config.${extension}`))) {
                debug(`Detected cypress.config.${extension} - using TS`);
                return 'ts';
            }
        }
        for (let extension of ['js', 'cjs', 'mjs']) {
            if (fs_1.default.existsSync(path_1.default.join(projectRoot, `cypress.config.${extension}`))) {
                debug(`Detected cypress.config.${extension} - using JS`);
                return 'js';
            }
        }
    }
    catch (e) {
        debug('Did not find cypress.config file');
    }
    // If we can't find an installed TypeScript, there's no way we can assume the project is using TypeScript,
    // because it won't work on the next step of installation anyway
    try {
        const typescriptFile = require.resolve('typescript', { paths: [projectRoot] });
        debug('Resolved typescript from %s', typescriptFile);
    }
    catch (_a) {
        debug('No typescript installed - using js');
        return 'js';
    }
    const allDeps = {
        ...(pkgJson.dependencies || {}),
        ...(pkgJson.devDependencies || {}),
    };
    if ('typescript' in allDeps) {
        debug('Detected typescript in package.json - using TS');
        return 'ts';
    }
    const joinPosix = (...s) => {
        return path_1.default.join(...s).split(path_1.default.sep).join(path_1.default.posix.sep);
    };
    const globs = [
        joinPosix('cypress', '**/*.{ts,tsx}'),
    ];
    if (!isMigrating) {
        globs.push(joinPosix('**/*tsconfig.json'));
    }
    const tsFiles = globby_1.default.sync(globs, { onlyFiles: true, gitignore: true, cwd: projectRoot, ignore: ['node_modules'] });
    if (tsFiles.filter((f) => !f.endsWith('.d.ts')).length > 0) {
        debug(`Detected ts file(s) ${tsFiles.join(',')} - using TS`);
        return 'ts';
    }
    debug('Defaulting to JS');
    return 'js';
}
exports.detectLanguage = detectLanguage;
