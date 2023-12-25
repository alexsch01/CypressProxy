"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateThirdPartyModule = exports.detectThirdPartyCTFrameworks = exports.isThirdPartyDefinition = exports.isRepositoryRoot = void 0;
const tslib_1 = require("tslib");
const path_1 = tslib_1.__importDefault(require("path"));
const globby_1 = tslib_1.__importDefault(require("globby"));
const zod_1 = require("zod");
const fs_extra_1 = tslib_1.__importDefault(require("fs-extra"));
const debug_1 = tslib_1.__importDefault(require("debug"));
const find_up_1 = tslib_1.__importDefault(require("find-up"));
const debug = (0, debug_1.default)('cypress:scaffold-config:ct-detect-third-party');
const DependencySchema = zod_1.z.object({
    type: zod_1.z.string(),
    name: zod_1.z.string(),
    package: zod_1.z.string(),
    installer: zod_1.z.string(),
    description: zod_1.z.string(),
    minVersion: zod_1.z.string(),
});
const DependencyArraySchema = zod_1.z.array(DependencySchema);
const BundlerSchema = zod_1.z.enum(['webpack', 'vite']);
const thirdPartyDefinitionPrefixes = {
    // matches @org/cypress-ct-*
    namespacedPrefixRe: /^@.+?\/cypress-ct-.+/,
    globalPrefix: 'cypress-ct-',
};
const ROOT_PATHS = [
    '.git',
    // https://pnpm.io/workspaces
    'pnpm-workspace.yaml',
    // https://rushjs.io/pages/advanced/config_files/
    'rush.json',
    // https://nx.dev/deprecated/workspace-json#workspace.json
    // https://nx.dev/reference/nx-json#nx.json
    'workspace.json',
    'nx.json',
    // https://lerna.js.org/docs/api-reference/configuration
    'lerna.json',
];
async function hasWorkspacePackageJson(directory) {
    try {
        const pkg = await fs_extra_1.default.readJson(path_1.default.join(directory, 'package.json'));
        debug('package file for %s: %o', directory, pkg);
        return !!pkg.workspaces;
    }
    catch (e) {
        debug('error reading package.json in %s. this is not the repository root', directory);
        return false;
    }
}
async function isRepositoryRoot(directory) {
    if (ROOT_PATHS.some((rootPath) => fs_extra_1.default.existsSync(path_1.default.join(directory, rootPath)))) {
        return true;
    }
    return hasWorkspacePackageJson(directory);
}
exports.isRepositoryRoot = isRepositoryRoot;
function isThirdPartyDefinition(definition) {
    return definition.type.startsWith(thirdPartyDefinitionPrefixes.globalPrefix) ||
        thirdPartyDefinitionPrefixes.namespacedPrefixRe.test(definition.type);
}
exports.isThirdPartyDefinition = isThirdPartyDefinition;
const ThirdPartyComponentFrameworkSchema = zod_1.z.object({
    type: zod_1.z.string().startsWith(thirdPartyDefinitionPrefixes.globalPrefix).or(zod_1.z.string().regex(thirdPartyDefinitionPrefixes.namespacedPrefixRe)),
    name: zod_1.z.string(),
    supportedBundlers: zod_1.z.array(BundlerSchema),
    detectors: DependencyArraySchema,
    dependencies: zod_1.z.function(),
    componentIndexHtml: zod_1.z.optional(zod_1.z.function()),
});
const CT_FRAMEWORK_GLOBAL_GLOB = path_1.default.join('node_modules', 'cypress-ct-*', 'package.json');
const CT_FRAMEWORK_NAMESPACED_GLOB = path_1.default.join('node_modules', '@*?/cypress-ct-*?', 'package.json');
async function detectThirdPartyCTFrameworks(projectRoot) {
    const erroredFrameworks = [];
    try {
        let fullPathGlobs;
        let packageJsonPaths = [];
        // Start at the project root and check each directory above it until we see
        // an indication that the current directory is the root of the repository.
        await (0, find_up_1.default)(async (directory) => {
            fullPathGlobs = [
                path_1.default.join(directory, CT_FRAMEWORK_GLOBAL_GLOB),
                path_1.default.join(directory, CT_FRAMEWORK_NAMESPACED_GLOB),
            ].map((x) => x.replaceAll('\\', '/'));
            debug('searching for third-party dependencies with globs %o', fullPathGlobs);
            const newPackagePaths = await (0, globby_1.default)(fullPathGlobs);
            if (newPackagePaths.length > 0) {
                debug('found third-party dependencies %o', newPackagePaths);
            }
            packageJsonPaths = [...packageJsonPaths, ...newPackagePaths];
            const isCurrentRepositoryRoot = await isRepositoryRoot(directory);
            if (isCurrentRepositoryRoot) {
                debug('stopping search at %s because it is believed to be the repository root', directory);
                return find_up_1.default.stop;
            }
            // Return undefined to keep searching
            return undefined;
        }, { cwd: projectRoot });
        if (packageJsonPaths.length === 0) {
            debug('no third-party dependencies detected');
            return { frameworks: [], erroredFrameworks };
        }
        debug('found third-party dependencies %o', packageJsonPaths);
        const modules = await Promise.all(packageJsonPaths.map(async (packageJsonPath) => {
            var _a;
            try {
                /**
                 * Node.js require.resolve resolves differently when given an absolute path vs package name e.g.
                 * - require.resolve('/<project-root>/node_modules/cypress-ct-solidjs') => packageJson.main
                 * - require.resolve('cypress-ct-solidjs', { paths: [projectRoot] }) => packageJson.exports
                 * We need to respect packageJson.exports so as to resolve the node specifier so we find package.json,
                 * get the packageRoot and then get the baseName giving us the module name
                 *
                 * Example package.json:
                 * {
                 *    "main": "index.mjs",
                 *    "exports": {
                 *      "node": "definition.mjs",
                 *      "default": "index.mjs"
                 *    }
                 * }
                */
                const pkgJson = await fs_extra_1.default.readJSON(packageJsonPath);
                const name = pkgJson.name;
                debug('`name` in package.json', name);
                debug('Attempting to resolve third party module with require.resolve: %s', name);
                const modulePath = require.resolve(pkgJson.name, { paths: [projectRoot] });
                debug('Resolve successful: %s', modulePath);
                debug('require(%s)', modulePath);
                const mod = require(modulePath);
                debug('Module is %o', mod);
                let defaultEntry = (_a = mod === null || mod === void 0 ? void 0 : mod.default) !== null && _a !== void 0 ? _a : mod;
                debug('Import successful: %o', defaultEntry);
                // adding the path here for use in error messages if needed
                const defaultEntryWithPath = Object.assign(defaultEntry, { path: modulePath });
                return defaultEntryWithPath;
            }
            catch (e) {
                erroredFrameworks.push({
                    path: packageJsonPath,
                    reason: 'error while resolving',
                });
                debug('Ignoring %s due to error resolving module', e);
            }
        })).then((modules) => {
            return modules.filter((m) => {
                if (!m)
                    return false;
                try {
                    return !!validateThirdPartyModule(m);
                }
                catch (e) {
                    debug('Failed to parse third party module with validation error: %o', e);
                    erroredFrameworks.push({
                        path: m.path,
                        reason: 'error while parsing',
                    });
                    return false;
                }
            });
        });
        return { frameworks: modules, erroredFrameworks };
    }
    catch (e) {
        debug('Error occurred while looking for 3rd party CT plugins: %o', e);
        return { frameworks: [], erroredFrameworks };
    }
}
exports.detectThirdPartyCTFrameworks = detectThirdPartyCTFrameworks;
function validateThirdPartyModule(m) {
    return ThirdPartyComponentFrameworkSchema.parse(m);
}
exports.validateThirdPartyModule = validateThirdPartyModule;
