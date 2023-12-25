"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CodeFrame = void 0;
const nexus_1 = require("nexus");
const gql_FileParts_1 = require("./gql-FileParts");
exports.CodeFrame = (0, nexus_1.objectType)({
    name: 'CodeFrame',
    description: 'A code frame to display for a file, used when displaying code related to errors',
    definition(t) {
        t.int('line', {
            description: 'The line number of the code snippet to display',
        });
        t.int('column', {
            description: 'The column of the error to display',
        });
        t.string('codeBlock', {
            description: 'Source of the code frame to display',
        });
        t.nonNull.field('file', {
            type: gql_FileParts_1.FileParts,
            resolve(source, args, ctx) {
                return { absolute: source.absolute };
            },
        });
    },
    sourceType: {
        module: '@packages/data-context/src/sources/ErrorDataSource',
        export: 'CodeFrameShape',
    },
});
