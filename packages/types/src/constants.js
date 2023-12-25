"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NPM_CYPRESS_REGISTRY_URL = exports.CYPRESS_REMOTE_MANIFEST_URL = exports.CY_IN_CY_SIMULATE_RUN_MODE = exports.RUN_ALL_SPECS = exports.RUN_ALL_SPECS_KEY = exports.MAJOR_VERSION_FOR_CONTENT = exports.PACKAGE_MANAGERS = exports.MIGRATION_STEPS = exports.CODE_LANGUAGES = exports.PLUGINS_STATE = void 0;
exports.PLUGINS_STATE = ['uninitialized', 'initializing', 'initialized', 'error'];
exports.CODE_LANGUAGES = [
    {
        type: 'js',
        name: 'JavaScript',
    },
    {
        type: 'ts',
        name: 'TypeScript',
    },
];
exports.MIGRATION_STEPS = ['renameAuto', 'renameManual', 'renameSupport', 'configFile', 'setupComponent'];
exports.PACKAGE_MANAGERS = ['npm', 'yarn', 'pnpm'];
// Note: ONLY change this in code that will be merged into a release branch
// for a new major version of Cypress
exports.MAJOR_VERSION_FOR_CONTENT = '13';
exports.RUN_ALL_SPECS_KEY = '__all';
exports.RUN_ALL_SPECS = {
    name: 'All E2E Specs',
    absolute: exports.RUN_ALL_SPECS_KEY,
    relative: exports.RUN_ALL_SPECS_KEY,
    baseName: exports.RUN_ALL_SPECS_KEY,
    fileName: exports.RUN_ALL_SPECS_KEY,
};
/**
 * In cypress-in-cypress tests that visit the app in open mode,
 * we use this to make `isRunMode` true on the UI side so that
 * we can test some run-mode-specific UI features
 */
exports.CY_IN_CY_SIMULATE_RUN_MODE = 'CY_IN_CY_SIMULATE_RUN_MODE';
// These are the URLS that we use to get the Cypress version and release time
exports.CYPRESS_REMOTE_MANIFEST_URL = 'https://download.cypress.io/desktop.json';
exports.NPM_CYPRESS_REGISTRY_URL = 'https://registry.npmjs.org/cypress';
