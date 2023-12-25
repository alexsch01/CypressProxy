"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveComponentFrameworkDefinition = exports.CT_FRAMEWORKS = exports.SUPPORT_STATUSES = exports.getBundler = exports.isDependencyInstalled = exports.isDependencyInstalledByName = void 0;
const tslib_1 = require("tslib");
const fs_extra_1 = tslib_1.__importDefault(require("fs-extra"));
const dependencies = tslib_1.__importStar(require("./dependencies"));
const component_index_template_1 = tslib_1.__importDefault(require("./component-index-template"));
const debug_1 = tslib_1.__importDefault(require("debug"));
const semver_1 = tslib_1.__importDefault(require("semver"));
const ct_detect_third_party_1 = require("./ct-detect-third-party");
const resolve_package_path_1 = tslib_1.__importDefault(require("resolve-package-path"));
const debug = (0, debug_1.default)('cypress:scaffold-config:frameworks');
async function isDependencyInstalledByName(packageName, projectPath) {
    let detectedVersion = null;
    try {
        debug('detecting %s in %s', packageName, projectPath);
        const packageFilePath = (0, resolve_package_path_1.default)(packageName, projectPath, false);
        if (!packageFilePath) {
            throw new Error('unable to resolve package file');
        }
        const pkg = await fs_extra_1.default.readJson(packageFilePath);
        debug('found package.json %o', pkg);
        if (!pkg.version) {
            throw Error(`${pkg.version} for ${packageName} is not a valid semantic version.`);
        }
        detectedVersion = pkg.version;
    }
    catch (e) {
        debug('error when detecting %s: %s', packageName, e.message);
    }
    return {
        dependency: packageName,
        detectedVersion,
    };
}
exports.isDependencyInstalledByName = isDependencyInstalledByName;
async function isDependencyInstalled(dependency, projectPath) {
    try {
        debug('detecting %s in %s', dependency.package, projectPath);
        const packageFilePath = (0, resolve_package_path_1.default)(dependency.package, projectPath, false);
        if (!packageFilePath) {
            debug('unable to resolve dependency %s', dependency.package);
            return {
                dependency,
                detectedVersion: null,
                satisfied: false,
            };
        }
        const pkg = await fs_extra_1.default.readJson(packageFilePath);
        debug('found package.json %o', pkg);
        if (!pkg.version) {
            throw Error(`${pkg.version} for ${dependency.package} is not a valid semantic version.`);
        }
        const satisfied = Boolean(pkg.version && semver_1.default.satisfies(pkg.version, dependency.minVersion, {
            includePrerelease: true,
        }));
        debug('%s is satisfied? %s', dependency.package, satisfied);
        return {
            dependency,
            detectedVersion: pkg.version,
            satisfied,
        };
    }
    catch (e) {
        debug('error when detecting %s: %s', dependency.package, e.message);
        return {
            dependency,
            detectedVersion: null,
            satisfied: false,
        };
    }
}
exports.isDependencyInstalled = isDependencyInstalled;
function getBundler(bundler) {
    switch (bundler) {
        case 'vite': return dependencies.WIZARD_DEPENDENCY_VITE;
        case 'webpack': return dependencies.WIZARD_DEPENDENCY_WEBPACK;
        default: throw Error(`Unknown bundler ${bundler}`);
    }
}
exports.getBundler = getBundler;
const mountModule = (mountModule) => (projectPath) => Promise.resolve(mountModule);
const reactMountModule = async (projectPath) => {
    const reactPkg = await isDependencyInstalled(dependencies.WIZARD_DEPENDENCY_REACT, projectPath);
    if (!reactPkg.detectedVersion || !semver_1.default.valid(reactPkg.detectedVersion)) {
        return 'cypress/react';
    }
    return semver_1.default.major(reactPkg.detectedVersion) === 18 ? 'cypress/react18' : 'cypress/react';
};
exports.SUPPORT_STATUSES = ['alpha', 'beta', 'full', 'community'];
exports.CT_FRAMEWORKS = [
    {
        type: 'reactscripts',
        configFramework: 'create-react-app',
        category: 'template',
        name: 'Create React App',
        supportedBundlers: ['webpack'],
        detectors: [dependencies.WIZARD_DEPENDENCY_REACT_SCRIPTS],
        dependencies: (bundler) => {
            return [
                dependencies.WIZARD_DEPENDENCY_REACT_SCRIPTS,
                dependencies.WIZARD_DEPENDENCY_REACT_DOM,
                dependencies.WIZARD_DEPENDENCY_REACT,
            ];
        },
        codeGenFramework: 'react',
        glob: '*.{js,jsx,tsx}',
        mountModule: reactMountModule,
        supportStatus: 'full',
        componentIndexHtml: (0, component_index_template_1.default)(),
    },
    {
        type: 'vueclivue2',
        configFramework: 'vue-cli',
        category: 'template',
        name: 'Vue CLI (Vue 2)',
        detectors: [dependencies.WIZARD_DEPENDENCY_VUE_CLI_SERVICE, dependencies.WIZARD_DEPENDENCY_VUE_2],
        supportedBundlers: ['webpack'],
        dependencies: (bundler) => {
            return [
                dependencies.WIZARD_DEPENDENCY_VUE_CLI_SERVICE,
                dependencies.WIZARD_DEPENDENCY_VUE_2,
            ];
        },
        codeGenFramework: 'vue',
        glob: '*.vue',
        mountModule: mountModule('cypress/vue2'),
        supportStatus: 'full',
        componentIndexHtml: (0, component_index_template_1.default)(),
    },
    {
        type: 'vueclivue3',
        configFramework: 'vue-cli',
        category: 'template',
        name: 'Vue CLI (Vue 3)',
        supportedBundlers: ['webpack'],
        detectors: [dependencies.WIZARD_DEPENDENCY_VUE_CLI_SERVICE, dependencies.WIZARD_DEPENDENCY_VUE_3],
        dependencies: (bundler) => {
            return [
                dependencies.WIZARD_DEPENDENCY_VUE_CLI_SERVICE,
                dependencies.WIZARD_DEPENDENCY_VUE_3,
            ];
        },
        codeGenFramework: 'vue',
        glob: '*.vue',
        mountModule: mountModule('cypress/vue'),
        supportStatus: 'full',
        componentIndexHtml: (0, component_index_template_1.default)(),
    },
    {
        type: 'nextjs',
        category: 'template',
        configFramework: 'next',
        name: 'Next.js',
        detectors: [dependencies.WIZARD_DEPENDENCY_NEXT],
        supportedBundlers: ['webpack'],
        dependencies: (bundler) => {
            return [
                dependencies.WIZARD_DEPENDENCY_NEXT,
                dependencies.WIZARD_DEPENDENCY_REACT,
                dependencies.WIZARD_DEPENDENCY_REACT_DOM,
            ];
        },
        codeGenFramework: 'react',
        glob: '*.{js,jsx,tsx}',
        mountModule: reactMountModule,
        supportStatus: 'full',
        /**
         * Next.js uses style-loader to inject CSS and requires this element to exist in the HTML.
         * @see: https://github.com/vercel/next.js/blob/5f3351dbb8de71bcdbc91d869c04bc862a25da5f/packages/next/build/webpack/config/blocks/css/loaders/client.ts#L24
         */
        componentIndexHtml: (0, component_index_template_1.default)([
            `<!-- Used by Next.js to inject CSS. -->\n`,
            `<div id="__next_css__DO_NOT_USE__"></div>`,
        ].join(' '.repeat(8))),
    },
    {
        type: 'nuxtjs',
        configFramework: 'nuxt',
        category: 'template',
        name: 'Nuxt.js (v2)',
        detectors: [dependencies.WIZARD_DEPENDENCY_NUXT],
        supportedBundlers: ['webpack'],
        dependencies: (bundler) => {
            return [
                dependencies.WIZARD_DEPENDENCY_NUXT,
                dependencies.WIZARD_DEPENDENCY_VUE_2,
            ];
        },
        codeGenFramework: 'vue',
        glob: '*.vue',
        mountModule: mountModule('cypress/vue2'),
        supportStatus: 'alpha',
        componentIndexHtml: (0, component_index_template_1.default)(),
    },
    {
        type: 'vue2',
        configFramework: 'vue',
        category: 'library',
        name: 'Vue.js 2',
        detectors: [dependencies.WIZARD_DEPENDENCY_VUE_2],
        supportedBundlers: ['webpack', 'vite'],
        dependencies: (bundler) => {
            return [
                getBundler(bundler),
                dependencies.WIZARD_DEPENDENCY_VUE_2,
            ];
        },
        codeGenFramework: 'vue',
        glob: '*.vue',
        mountModule: mountModule('cypress/vue2'),
        supportStatus: 'full',
        componentIndexHtml: (0, component_index_template_1.default)(),
    },
    {
        type: 'vue3',
        configFramework: 'vue',
        category: 'library',
        name: 'Vue.js 3',
        detectors: [dependencies.WIZARD_DEPENDENCY_VUE_3],
        supportedBundlers: ['webpack', 'vite'],
        dependencies: (bundler) => {
            return [
                getBundler(bundler),
                dependencies.WIZARD_DEPENDENCY_VUE_3,
            ];
        },
        codeGenFramework: 'vue',
        glob: '*.vue',
        mountModule: mountModule('cypress/vue'),
        supportStatus: 'full',
        componentIndexHtml: (0, component_index_template_1.default)(),
    },
    {
        type: 'react',
        configFramework: 'react',
        category: 'library',
        name: 'React.js',
        detectors: [dependencies.WIZARD_DEPENDENCY_REACT],
        supportedBundlers: ['webpack', 'vite'],
        dependencies: (bundler) => {
            return [
                getBundler(bundler),
                dependencies.WIZARD_DEPENDENCY_REACT,
                dependencies.WIZARD_DEPENDENCY_REACT_DOM,
            ];
        },
        codeGenFramework: 'react',
        glob: '*.{js,jsx,tsx}',
        mountModule: reactMountModule,
        supportStatus: 'full',
        componentIndexHtml: (0, component_index_template_1.default)(),
    },
    {
        type: 'angular',
        configFramework: 'angular',
        category: 'template',
        name: 'Angular',
        detectors: [dependencies.WIZARD_DEPENDENCY_ANGULAR_CLI],
        supportedBundlers: ['webpack'],
        dependencies: (bundler) => {
            return [
                dependencies.WIZARD_DEPENDENCY_ANGULAR_CLI,
                dependencies.WIZARD_DEPENDENCY_ANGULAR_DEVKIT_BUILD_ANGULAR,
                dependencies.WIZARD_DEPENDENCY_ANGULAR_CORE,
                dependencies.WIZARD_DEPENDENCY_ANGULAR_COMMON,
                dependencies.WIZARD_DEPENDENCY_ANGULAR_PLATFORM_BROWSER_DYNAMIC,
            ];
        },
        codeGenFramework: 'angular',
        glob: '*.component.ts',
        mountModule: mountModule('cypress/angular'),
        supportStatus: 'full',
        componentIndexHtml: (0, component_index_template_1.default)(),
        specPattern: '**/*.cy.ts',
    },
    {
        type: 'svelte',
        configFramework: 'svelte',
        category: 'library',
        name: 'Svelte.js',
        detectors: [dependencies.WIZARD_DEPENDENCY_SVELTE],
        supportedBundlers: ['webpack', 'vite'],
        dependencies: (bundler) => {
            return [
                getBundler(bundler),
                dependencies.WIZARD_DEPENDENCY_SVELTE,
            ];
        },
        codeGenFramework: 'svelte',
        glob: '*.svelte',
        mountModule: mountModule('cypress/svelte'),
        supportStatus: 'alpha',
        componentIndexHtml: (0, component_index_template_1.default)(),
    },
];
/**
 * Given a first or third party Component Framework Definition,
 * resolves into a unified ResolvedComponentFrameworkDefinition.
 * This way we have a single type used throughout Cypress.
 */
function resolveComponentFrameworkDefinition(definition) {
    const thirdParty = (0, ct_detect_third_party_1.isThirdPartyDefinition)(definition);
    const dependencies = async (bundler, projectPath) => {
        const declaredDeps = definition.dependencies(bundler);
        // Must add bundler based on launchpad selection if it's a third party definition.
        if (thirdParty) {
            declaredDeps.push(getBundler(bundler));
        }
        return await Promise.all(declaredDeps.map((dep) => isDependencyInstalled(dep, projectPath)));
    };
    if (thirdParty) {
        return {
            ...definition,
            category: 'library',
            dependencies,
            configFramework: definition.type,
            supportStatus: 'community',
            mountModule: () => Promise.resolve(definition.type),
        };
    }
    return { ...definition, dependencies };
}
exports.resolveComponentFrameworkDefinition = resolveComponentFrameworkDefinition;
