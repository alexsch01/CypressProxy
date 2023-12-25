"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Spec = void 0;
const nexus_1 = require("nexus");
const enumTypes_1 = require("../enumTypes");
const gql_GitInfo_1 = require("./gql-GitInfo");
exports.Spec = (0, nexus_1.objectType)({
    name: 'Spec',
    description: 'Represents a spec on the file system',
    node: 'absolute',
    definition(t) {
        t.nonNull.field('specType', {
            type: enumTypes_1.SpecTypeEnum,
            description: 'Type of spec (e.g. component | integration)',
        });
        t.nonNull.string('absolute', {
            description: 'Absolute path to spec (e.g. /Users/jess/my-project/src/component/MySpec.test.tsx)',
        });
        t.nonNull.string('relative', {
            description: 'Relative path to spec (e.g. src/component/MySpec.test.tsx)',
        });
        t.nonNull.string('baseName', {
            description: 'Full name of spec file (e.g. MySpec.test.tsx)',
        });
        t.nonNull.string('name', {
            description: 'Full name of spec file (e.g. MySpec.test.tsx)',
        });
        t.nonNull.string('fileExtension', {
            description: 'The file extension (e.g. tsx, jsx)',
        });
        t.nonNull.string('specFileExtension', {
            description: `The spec file's extension, including "spec" pattern (e.g. .spec.tsx, -spec.tsx, -test.tsx)`,
        });
        t.nonNull.string('fileName', {
            description: `The first part of the file, without extensions (e.g. MySpec)`,
        });
        t.field('gitInfo', {
            type: gql_GitInfo_1.GitInfo,
            description: 'Git information about the spec file',
            resolve: async (source, args, ctx) => {
                var _a, _b;
                return (_b = (_a = ctx.lifecycleManager.git) === null || _a === void 0 ? void 0 : _a.gitInfoFor(source.absolute)) !== null && _b !== void 0 ? _b : null;
            },
        });
        t.remoteField('cloudSpec', {
            type: 'CloudProjectSpecResult',
            remoteQueryField: 'cloudSpecByPath',
            shouldEagerFetch: () => false, // defaults to false to be fully lazy and rely on the UI to fetch as needed
            queryArgs: async (source, args, ctx) => {
                var _a;
                const projectId = await ctx.project.projectId();
                const fromBranch = (_a = ctx.lifecycleManager.git) === null || _a === void 0 ? void 0 : _a.currentBranch;
                if (!projectId) {
                    return false;
                }
                return {
                    projectSlug: projectId,
                    specPath: source.relative,
                    fromBranch,
                };
            },
        });
    },
});
