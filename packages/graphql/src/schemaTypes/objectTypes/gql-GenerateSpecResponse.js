"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GenerateSpecResponse = void 0;
const nexus_1 = require("nexus");
const unions_1 = require("../unions");
const gql_CurrentProject_1 = require("./gql-CurrentProject");
exports.GenerateSpecResponse = (0, nexus_1.objectType)({
    name: 'GenerateSpecResponse',
    description: 'Error from generated spec',
    definition(t) {
        t.field('currentProject', {
            type: gql_CurrentProject_1.CurrentProject,
            description: 'The currently opened project',
            resolve: (root, args, ctx) => {
                if (ctx.coreData.currentProject) {
                    return ctx.lifecycleManager;
                }
                return null;
            },
        });
        t.field('generatedSpecResult', {
            type: unions_1.GeneratedSpecResult,
            description: 'The file that have just been scaffolded or the fileName that errored',
            resolve: (root, args, ctx) => root,
        });
    },
    sourceType: {
        module: __filename,
        export: 'ScaffoldedFileSource',
    },
});
