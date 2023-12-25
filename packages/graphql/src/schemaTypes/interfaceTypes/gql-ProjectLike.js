"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectLike = void 0;
const tslib_1 = require("tslib");
const dedent_1 = tslib_1.__importDefault(require("dedent"));
const nexus_1 = require("nexus");
exports.ProjectLike = (0, nexus_1.interfaceType)({
    name: 'ProjectLike',
    description: 'Common base fields inherited by GlobalProject / CurrentProject',
    definition(t) {
        t.nonNull.string('projectRoot', {
            description: 'Absolute path to the project on the filesystem',
        });
        t.string('projectId', {
            description: 'Used to associate project with Cypress Cloud',
            resolve: (source, args, ctx) => ctx.project.maybeGetProjectId(source),
        });
        t.nonNull.string('title', {
            resolve: (source, args, ctx) => ctx.project.projectTitle(source.projectRoot),
        });
        t.remoteField('cloudProjectRemote', {
            type: 'CloudProjectResult',
            remoteQueryField: 'cloudProjectBySlug',
            description: (0, dedent_1.default) `
        A refetchable remote field implementation to fetch the cloudProject,
        this can safely be used when rendering a list of projects
      `,
            queryArgs: async (source, args, ctx) => {
                const projectId = await ctx.project.maybeGetProjectId(source);
                if (projectId) {
                    return { slug: projectId };
                }
                return false;
            },
        });
    },
    resolveType(root) {
        return 'GlobalProject';
    },
    sourceType: {
        module: '@packages/data-context/src/data/coreDataShape',
        export: 'ProjectShape',
    },
});
