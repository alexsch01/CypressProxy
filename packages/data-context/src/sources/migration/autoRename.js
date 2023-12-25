"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSpecs = exports.applyMigrationTransform = exports.substitute = exports.defaultMigrationTransformOptions = void 0;
const tslib_1 = require("tslib");
const globby_1 = tslib_1.__importDefault(require("globby"));
const _1 = require(".");
exports.defaultMigrationTransformOptions = {
    shouldMigratePreExtension: true,
};
function substitute(part, options = exports.defaultMigrationTransformOptions) {
    // nothing to substitute, just a regular
    // part of the file
    if (!('group' in part)) {
        return part;
    }
    // cypress/integration -> cypress/e2e
    if (part.group === 'folder' && part.text === 'integration') {
        return { ...part, text: 'e2e' };
    }
    // basic.spec.js -> basic.cy.js
    if (part.group === 'preExtension' && options.shouldMigratePreExtension) {
        return { ...part, text: '.cy.' };
    }
    // support/index.js -> support/e2e.js
    if (part.group === 'supportFileName' && part.text === 'index') {
        return { ...part, text: 'e2e' };
    }
    return part;
}
exports.substitute = substitute;
function applyMigrationTransform(spec, options = exports.defaultMigrationTransformOptions) {
    let regexp;
    if (spec.testingType === 'e2e' && spec.usesDefaultFolder && spec.usesDefaultTestFiles) {
        // e2e, cypress/integration, **/* (default testFiles)
        regexp = new RegExp(_1.regexps.e2e.before.defaultFolderDefaultTestFiles);
    }
    else if (spec.testingType === 'e2e' && !spec.usesDefaultFolder && spec.usesDefaultTestFiles) {
        // e2e, custom-folder, **/* (default testFiles)
        regexp = new RegExp(_1.regexps.e2e.before.customFolderDefaultTestFiles);
    }
    else if (spec.testingType === 'e2e' && spec.usesDefaultFolder && !spec.usesDefaultTestFiles) {
        // e2e, cypress/integration , **/*.spec.ts (custom testFiles)
        regexp = new RegExp(_1.regexps.e2e.before.defaultFolderCustomTestFiles);
    }
    else if (spec.testingType === 'component' && spec.usesDefaultFolder && spec.usesDefaultTestFiles) {
        // component, cypress/component , (default testFiles)
        regexp = new RegExp(_1.regexps.component.before.defaultFolderDefaultTestFiles);
    }
    else if (spec.testingType === 'component' && !spec.usesDefaultFolder && spec.usesDefaultTestFiles) {
        // component, cypress/custom-component , (default testFiles)
        regexp = new RegExp(_1.regexps.component.before.customFolderDefaultTestFiles);
    }
    else {
        // custom folder AND test files pattern
        // should be impossible, we should not call this function in the first place.
        throw Error(`Cannot use applyMigrationTransform on a project with a custom folder and custom testFiles.`);
    }
    const partsBeforeMigration = (0, _1.formatMigrationFile)(spec.relative, regexp, options);
    const partsAfterMigration = partsBeforeMigration.map((part) => {
        // avoid re-renaming files with the right preExtension
        // it would make a myFile.cy.cy.js file
        if (part.highlight
            && part.group === 'preExtension'
            && /\.cy\.([j|t]s[x]?|coffee)$/.test(spec.relative)) {
            return part;
        }
        return substitute(part, options);
    });
    return {
        testingType: spec.testingType,
        before: {
            relative: spec.relative,
            parts: partsBeforeMigration,
        },
        after: {
            relative: partsAfterMigration.map((x) => x.text).join(''),
            parts: partsAfterMigration,
        },
    };
}
exports.applyMigrationTransform = applyMigrationTransform;
async function getSpecs(projectRoot, config) {
    const integrationFolder = (0, _1.getIntegrationFolder)(config);
    const integrationTestFiles = (0, _1.getIntegrationTestFilesGlobs)(config);
    const componentFolder = (0, _1.getComponentFolder)(config);
    const componentTestFiles = (0, _1.getComponentTestFilesGlobs)(config);
    let integrationSpecs = [];
    let componentSpecs = [];
    const globs = integrationFolder
        ? integrationFolder === _1.legacyIntegrationFolder
            ? [_1.defaultTestFilesGlob].map((glob) => `${integrationFolder}/${glob}`)
            : integrationTestFiles.map((glob) => `${integrationFolder}/${glob}`)
        : [];
    let specs = integrationFolder
        ? (await (0, globby_1.default)(globs, { onlyFiles: true, cwd: projectRoot }))
        : [];
    const fullyCustom = integrationFolder !== _1.legacyIntegrationFolder && !(0, _1.isDefaultTestFiles)(config, 'integration');
    // we cannot do a migration if either integrationFolder is false,
    // or if both the integrationFolder and testFiles are custom.
    if (fullyCustom) {
        integrationSpecs = [];
    }
    else {
        integrationSpecs = specs.map((relative) => {
            return {
                relative,
                usesDefaultFolder: integrationFolder === _1.legacyIntegrationFolder,
                usesDefaultTestFiles: (0, _1.isDefaultTestFiles)(config, 'integration'),
                testingType: 'e2e',
            };
        });
    }
    if (componentFolder === false || !(0, _1.isDefaultTestFiles)(config, 'component')) {
        componentSpecs = [];
    }
    else {
        const globs = componentTestFiles.map((glob) => {
            return `${componentFolder}/${glob}`;
        });
        componentSpecs = (await (0, globby_1.default)(globs, { onlyFiles: true, cwd: projectRoot })).map((relative) => {
            return {
                relative,
                usesDefaultFolder: componentFolder === 'cypress/component',
                usesDefaultTestFiles: (0, _1.isDefaultTestFiles)(config, 'component'),
                testingType: 'component',
            };
        });
    }
    return {
        component: componentSpecs,
        integration: integrationSpecs,
    };
}
exports.getSpecs = getSpecs;
