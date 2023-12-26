"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hasDefaultExport = void 0;
const parser_1 = require("@babel/parser");
const recast_1 = require("recast");
const babelParserOptions = {
    sourceType: 'module',
    strictMode: false,
    tokens: true,
    plugins: [
        'decorators-legacy',
        'doExpressions',
        'objectRestSpread',
        'classProperties',
        'classPrivateProperties',
        'classPrivateMethods',
        'exportDefaultFrom',
        'exportNamespaceFrom',
        'asyncGenerators',
        'functionBind',
        'functionSent',
        'dynamicImport',
        'numericSeparator',
        'optionalChaining',
        'importMeta',
        'bigInt',
        'optionalCatchBinding',
        'throwExpressions',
        'nullishCoalescingOperator',
        'typescript',
    ],
};
function hasDefaultExport(src) {
    const ast = (0, parser_1.parse)(src, babelParserOptions);
    let hasDefault = false;
    (0, recast_1.visit)(ast, {
        visitExportDefaultDeclaration() {
            hasDefault = true;
            return false;
        },
    });
    return hasDefault;
}
exports.hasDefaultExport = hasDefaultExport;
