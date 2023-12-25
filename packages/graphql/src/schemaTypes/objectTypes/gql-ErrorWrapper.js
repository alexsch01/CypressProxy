"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorWrapper = void 0;
const errors_1 = require(process.argv[1]+"/../packages/errors");
const nexus_1 = require("nexus");
const gql_ErrorTypeEnum_1 = require("../enumTypes/gql-ErrorTypeEnum");
const gql_CodeFrame_1 = require("./gql-CodeFrame");
exports.ErrorWrapper = (0, nexus_1.objectType)({
    name: 'ErrorWrapper',
    description: 'Base error',
    definition(t) {
        t.nonNull.id('id', {
            description: 'The ID for the error, used to clear the error',
        });
        t.string('title', {
            description: 'Optional title of the error. Used to optionally display a title above the error',
        });
        t.nonNull.string('errorName', {
            description: 'Name of the error class',
            resolve(source) {
                var _a;
                return ((_a = source.cypressError.originalError) === null || _a === void 0 ? void 0 : _a.name) || source.cypressError.name;
            },
        });
        t.nonNull.string('errorStack', {
            description: 'The error stack of either the original error from the user or from where the internal Cypress error was created',
            resolve(source) {
                return (0, errors_1.stripAnsi)(source.cypressError.stack || '');
            },
        });
        t.nonNull.field('errorType', {
            type: gql_ErrorTypeEnum_1.ErrorTypeEnum,
            resolve: (source) => { var _a; return (_a = source.cypressError.type) !== null && _a !== void 0 ? _a : 'UNEXPECTED_INTERNAL_ERROR'; },
        });
        t.nonNull.string('errorMessage', {
            description: 'The markdown formatted content associated with the ErrorTypeEnum',
            resolve(source) {
                var _a;
                return (_a = source.cypressError.messageMarkdown) !== null && _a !== void 0 ? _a : source.cypressError.message;
            },
        });
        t.nonNull.boolean('isUserCodeError', {
            description: 'Whether the error came from user code, can be used to determine whether to open a stack trace by default',
            resolve(source, args, ctx) {
                return ctx.error.isUserCodeError(source);
            },
        });
        t.field('codeFrame', {
            type: gql_CodeFrame_1.CodeFrame,
            description: 'The code frame to display in relation to the error',
            resolve: (source, args, ctx) => {
                return ctx.error.codeFrame(source).catch(
                // Don't worry if we try to get a non-existent file
                () => null);
            },
        });
    },
    sourceType: {
        module: '@packages/errors',
        export: 'ErrorWrapperSource',
    },
});
