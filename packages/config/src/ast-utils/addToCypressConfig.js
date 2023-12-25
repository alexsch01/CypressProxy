"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.defineConfigAvailable = exports.addTestingTypeToCypressConfig = exports.addProjectIdToCypressConfig = exports.addToCypressConfig = void 0;
const tslib_1 = require("tslib");
const t = tslib_1.__importStar(require("@babel/types"));
const traverse_1 = tslib_1.__importDefault(require("@babel/traverse"));
const fs_extra_1 = tslib_1.__importDefault(require("fs-extra"));
const dedent_1 = tslib_1.__importDefault(require("dedent"));
const path_1 = tslib_1.__importDefault(require("path"));
const debug_1 = tslib_1.__importDefault(require("debug"));
const recast_1 = require("recast");
const addToCypressConfigPlugin_1 = require("./addToCypressConfigPlugin");
const astConfigHelpers_1 = require("./astConfigHelpers");
const debug = (0, debug_1.default)('cypress:config:addToCypressConfig');
/**
 * Adds to the Cypress config, using the Babel AST utils.
 *
 * Injects the export at the top of the config definition, based on the common patterns of:
 *
 * export default { ...
 *
 * export default defineConfig({ ...
 *
 * module.exports = { ...
 *
 * module.exports = defineConfig({ ...
 *
 * export = { ...
 *
 * export = defineConfig({ ...
 *
 * If we don't match one of these, we'll use the rest-spread pattern on whatever
 * the current default export of the file is:
 *
 * current:
 *    export default createConfigFn()
 *
 * becomes:
 *    export default {
 *      projectId: '...',
 *      ...createConfigFn()
 *    }
 */
async function addToCypressConfig(filePath, code, toAdd) {
    try {
        const ast = (0, recast_1.parse)(code, {
            parser: require('recast/parsers/typescript'),
        });
        (0, traverse_1.default)(ast, (0, addToCypressConfigPlugin_1.addToCypressConfigPlugin)(toAdd).visitor);
        return (0, recast_1.print)(ast).code;
    }
    catch (e) {
        debug(`Error adding properties to %s: %s`, filePath, e.stack);
        throw new Error(`Unable to automerge with the config file`);
    }
}
exports.addToCypressConfig = addToCypressConfig;
async function addProjectIdToCypressConfig(options) {
    try {
        let result = await fs_extra_1.default.readFile(options.filePath, 'utf8');
        const toPrint = await addToCypressConfig(options.filePath, result, t.objectProperty(t.identifier('projectId'), t.identifier(options.projectId)));
        await fs_extra_1.default.writeFile(options.filePath, maybeFormatWithPrettier(toPrint, options.filePath));
        return {
            result: 'MERGED',
        };
    }
    catch (e) {
        return {
            result: 'NEEDS_MERGE',
            error: e,
        };
    }
}
exports.addProjectIdToCypressConfig = addProjectIdToCypressConfig;
async function addTestingTypeToCypressConfig(options) {
    const toAdd = options.info.testingType === 'e2e' ? (0, astConfigHelpers_1.addE2EDefinition)() : (0, astConfigHelpers_1.addComponentDefinition)(options.info);
    try {
        let result = undefined;
        let resultStatus = 'MERGED';
        try {
            result = await fs_extra_1.default.readFile(options.filePath, 'utf8');
        }
        catch (e) {
            // If we can't find the file, or it's an empty file, let's create a new one
        }
        const pathExt = path_1.default.extname(options.filePath);
        // If for some reason they have deleted the contents of the file, we want to recover
        // gracefully by adding some default code to use as the AST here, based on the extension
        if (!result || result.trim() === '') {
            resultStatus = 'ADDED';
            result = getEmptyCodeBlock({ outputType: pathExt, isProjectUsingESModules: options.isProjectUsingESModules, projectRoot: options.projectRoot });
        }
        const toPrint = await addToCypressConfig(options.filePath, result, toAdd);
        await fs_extra_1.default.writeFile(options.filePath, maybeFormatWithPrettier(toPrint, options.filePath));
        return {
            result: resultStatus,
        };
    }
    catch (e) {
        return {
            result: 'NEEDS_MERGE',
            error: e,
            codeToMerge: (0, recast_1.print)(toAdd).code,
        };
    }
}
exports.addTestingTypeToCypressConfig = addTestingTypeToCypressConfig;
// If they are running Cypress that isn't installed in their
// project's node_modules, we don't want to include
// defineConfig(/***/) in their cypress.config.js,
// since it won't exist.
function defineConfigAvailable(projectRoot) {
    try {
        const cypress = require.resolve('cypress', {
            paths: [projectRoot],
        });
        const api = require(cypress);
        return 'defineConfig' in api;
    }
    catch (e) {
        return false;
    }
}
exports.defineConfigAvailable = defineConfigAvailable;
// Necessary to handle the edge case of them deleting the contents of their Cypress
// config file, just before we merge in the testing type
function getEmptyCodeBlock({ outputType, isProjectUsingESModules, projectRoot }) {
    if (defineConfigAvailable(projectRoot)) {
        if (outputType === '.ts' || outputType === '.mjs' || isProjectUsingESModules) {
            return (0, dedent_1.default) `
        import { defineConfig } from 'cypress'

        export default defineConfig({

        })
      `;
        }
        return (0, dedent_1.default) `
      const { defineConfig } = require('cypress')

      module.exports = defineConfig({

      })
    `;
    }
    if (outputType === '.ts' || outputType === '.mjs' || isProjectUsingESModules) {
        return (0, dedent_1.default) `
      export default {

      }
    `;
    }
    return (0, dedent_1.default) `
    module.exports = {

    }
  `;
}
function maybeFormatWithPrettier(code, filePath) {
    try {
        const prettier = require('prettier');
        return prettier.format(code, {
            filepath: filePath,
        });
    }
    catch (_a) {
        //
        return code;
    }
}
