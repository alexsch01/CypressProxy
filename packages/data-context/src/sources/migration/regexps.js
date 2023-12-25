"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.supportFileRegexps = exports.regexps = void 0;
/**
 * This partial regular expression is used to extract
 * the extension from a spec file name:
 *
 * matches
 * - file.spec.tsx -> ext=".spec."
 * - file_Spec.jsx -> ext="_Spec."
 * - file-spec.js -> ext="-spec."
 * - spec.jsx -> ext="."
 *
 * The final objective being to be able to replace "ext" with ".cy."
 */
const specExtRe = '(?:[._-]?(?:[s|S]pec|[T|t]est))?[.])(?<extension>(?:[j|t]s[x]?|coffee|cjsx)';
exports.regexps = {
    e2e: {
        before: {
            defaultFolderDefaultTestFiles: `cypress\/(?<folder>integration)\/(?<fileName>.+?)(?<preExtension>${specExtRe})$`,
            defaultFolderCustomTestFiles: `cypress\/(?<folder>integration)\/(?<fileName>.+)$`,
            customFolderDefaultTestFiles: `(?<fileName>.+?)(?<preExtension>${specExtRe})$`,
        },
    },
    component: {
        before: {
            defaultFolderDefaultTestFiles: `(?<fileName>cypress\/component\/.+?)(?<preExtension>${specExtRe})`,
            customFolderDefaultTestFiles: `(?<fileName>.+?)(?<preExtension>${specExtRe})`,
        },
    },
};
exports.supportFileRegexps = {
    e2e: {
        beforeRegexp: 'cypress[\\\\/]support[\\\\/](?<supportFileName>index)(?<extension>\.(?:[j|t]sx?|coffee))',
        afterRegexp: 'cypress[\\\\/]support[\\\\/](?<supportFileName>e2e)(?<extension>\.(?:[j|t]sx?|coffee))',
    },
};
