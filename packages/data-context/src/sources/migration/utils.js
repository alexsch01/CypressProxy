"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDefaultSpecFileName = exports.isDefaultSupportFile = void 0;
const tslib_1 = require("tslib");
const config_1 = require(process.argv[1]+"/../packages/config");
const debug_1 = tslib_1.__importDefault(require("debug"));
const lodash_1 = tslib_1.__importDefault(require("lodash"));
const path_1 = tslib_1.__importDefault(require("path"));
const ProjectDataSource_1 = require("../ProjectDataSource");
const isDefaultSupportFile = (supportFile) => {
    if (lodash_1.default.isNil(supportFile) || !lodash_1.default.isBoolean(supportFile) && supportFile.match(/(^|\.+\/)cypress\/support($|\/index($|\.(ts|js|coffee)$))/)) {
        return true;
    }
    return false;
};
exports.isDefaultSupportFile = isDefaultSupportFile;
async function getDefaultSpecFileName({ currentProject, testingType, fileExtensionToUse, specPattern, specs = [], name }) {
    const debug = (0, debug_1.default)('cypress:data-context:sources:migration:utils');
    const defaultFilename = `${name ? name : testingType === 'e2e' ? 'spec' : 'ComponentName'}.cy.${fileExtensionToUse}`;
    const defaultPathname = path_1.default.join('cypress', testingType !== null && testingType !== void 0 ? testingType : 'e2e', defaultFilename);
    if (!currentProject || !testingType) {
        debug('currentProject or testingType undefined. Error intelligently detecting default filename, using safe default %o', defaultPathname);
        return defaultPathname;
    }
    try {
        let specPatternSet;
        if (Array.isArray(specPattern)) {
            specPatternSet = specPattern[0];
        }
        // 1. If there is no spec pattern, use the default for this testing type.
        if (!specPatternSet) {
            return defaultPathname;
        }
        // 2. If the spec pattern is the default spec pattern, return the default for this testing type.
        if (specPatternSet === config_1.defaultSpecPattern[testingType]) {
            return defaultPathname;
        }
        const pathFromSpecPattern = (0, ProjectDataSource_1.getPathFromSpecPattern)({ specPattern: specPatternSet, testingType, fileExtensionToUse, name });
        const filename = pathFromSpecPattern ? path_1.default.basename(pathFromSpecPattern) : defaultFilename;
        // 3. If there are existing specs, return the longest common path prefix between them, if it is non-empty.
        const commonPrefixFromSpecs = (0, ProjectDataSource_1.getLongestCommonPrefixFromPaths)(specs.map((spec) => spec.relative));
        if (commonPrefixFromSpecs)
            return path_1.default.join(commonPrefixFromSpecs, filename);
        // 4. Otherwise, return a path that fulfills the spec pattern.
        if (pathFromSpecPattern)
            return pathFromSpecPattern;
        // 5. Return the default for this testing type if we cannot decide from the spec pattern.
        return defaultPathname;
    }
    catch (err) {
        debug('Error intelligently detecting default filename, using safe default %o', err);
        return defaultPathname;
    }
}
exports.getDefaultSpecFileName = getDefaultSpecFileName;
