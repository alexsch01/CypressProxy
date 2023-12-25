"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Query = void 0;
const nexus_1 = require("nexus");
const gql_ProjectLike_1 = require("../interfaceTypes/gql-ProjectLike");
const gql_ScaffoldedFile_1 = require("./gql-ScaffoldedFile");
const gql_CurrentProject_1 = require("./gql-CurrentProject");
const gql_DevState_1 = require("./gql-DevState");
const gql_AuthState_1 = require("./gql-AuthState");
const gql_LocalSettings_1 = require("./gql-LocalSettings");
const gql_Migration_1 = require("./gql-Migration");
const gql_VersionData_1 = require("./gql-VersionData");
const gql_Wizard_1 = require("./gql-Wizard");
const gql_ErrorWrapper_1 = require("./gql-ErrorWrapper");
const gql_CachedUser_1 = require("./gql-CachedUser");
const gql_Cohorts_1 = require("./gql-Cohorts");
exports.Query = (0, nexus_1.objectType)({
    name: 'Query',
    description: 'The root "Query" type containing all entry fields for our querying',
    definition(t) {
        t.field('baseError', {
            type: gql_ErrorWrapper_1.ErrorWrapper,
            resolve: (root, args, ctx) => ctx.coreData.diagnostics.error,
        });
        t.field('cachedUser', {
            type: gql_CachedUser_1.CachedUser,
            resolve: (root, args, ctx) => ctx.coreData.user,
        });
        t.nonNull.list.nonNull.field('warnings', {
            type: gql_ErrorWrapper_1.ErrorWrapper,
            description: 'A list of warnings',
            resolve: (source, args, ctx) => {
                return ctx.coreData.diagnostics.warnings;
            },
        });
        t.nonNull.field('wizard', {
            type: gql_Wizard_1.Wizard,
            description: 'Metadata about the wizard',
            resolve: (root, args, ctx) => ctx.coreData.wizard,
        });
        t.field('migration', {
            type: gql_Migration_1.Migration,
            description: 'Metadata about the migration, null if we aren\'t showing it',
            resolve: async (root, args, ctx) => {
                // First check to see if "legacyConfigForMigration" is defined as that means we have started migration
                if (ctx.coreData.migration.legacyConfigForMigration)
                    return ctx.coreData.migration.legacyConfigForMigration;
                if (!ctx.migration.needsCypressJsonMigration()) {
                    return null;
                }
                await ctx.lifecycleManager.legacyMigration();
                return ctx.coreData.migration.legacyConfigForMigration;
            },
        });
        t.nonNull.field('dev', {
            type: gql_DevState_1.DevState,
            description: 'The state of any info related to local development of the runner',
            resolve: (root, args, ctx) => ctx.coreData.dev,
        });
        t.field('versions', {
            deferIfNotLoaded: true,
            type: gql_VersionData_1.VersionData,
            description: 'Previous versions of cypress and their release date',
            resolve: (root, args, ctx) => {
                return ctx.versions.versionData();
            },
        });
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
        t.nonNull.list.nonNull.field('projects', {
            type: gql_ProjectLike_1.ProjectLike,
            description: 'All known projects for the app',
            resolve: (root, args, ctx) => ctx.coreData.app.projects,
        });
        t.nonNull.boolean('isGlobalMode', {
            description: 'Whether the app is in global mode or not. This is based off the presence of a project, which is set by the CLI (or absent if the app is run directly). See cli/lib/exec/open.js for the logic that sets the project or not.',
            resolve: (source, args, ctx) => !ctx.modeOptions.project,
        });
        t.nonNull.field('authState', {
            type: gql_AuthState_1.AuthState,
            description: 'The latest state of the auth process',
            resolve: (source, args, ctx) => ctx.coreData.authState,
        });
        t.nonNull.field('localSettings', {
            type: gql_LocalSettings_1.LocalSettings,
            description: 'local settings on a device-by-device basis',
            resolve: (source, args, ctx) => {
                return ctx.coreData.localSettings;
            },
        });
        t.list.nonNull.field('scaffoldedFiles', {
            description: 'The files that have just been scaffolded',
            type: gql_ScaffoldedFile_1.ScaffoldedFile,
            resolve: (_, args, ctx) => ctx.coreData.scaffoldedFiles,
        });
        t.nonNull.boolean('invokedFromCli', {
            description: 'Whether the app was invoked from the CLI, false if user is using the binary directly (not invoked from package manager e.g. npm)',
            resolve: (source, args, ctx) => Boolean(ctx.modeOptions.invokedFromCli),
        });
        t.field('cohort', {
            description: 'Return the cohort for the given name',
            type: gql_Cohorts_1.Cohort,
            args: {
                name: (0, nexus_1.nonNull)((0, nexus_1.stringArg)({ description: 'the name of the cohort to find' })),
            },
            resolve: async (source, args, ctx) => {
                var _a;
                return (_a = await ctx.config.cohortsApi.getCohort(args.name)) !== null && _a !== void 0 ? _a : null;
            },
        });
        t.field('node', {
            type: 'Node',
            args: {
                id: (0, nexus_1.nonNull)((0, nexus_1.idArg)()),
            },
            resolve: (root, args, ctx, info) => {
                // Cast as any, because this is extremely difficult to type correctly
                return ctx.graphql.resolveNode(args.id, ctx, info);
            },
        });
        t.string('machineId', {
            description: 'Unique node machine identifier for this instance - may be nil if unable to resolve',
            resolve: async (source, args, ctx) => await ctx.coreData.machineId,
        });
        t.string('videoEmbedHtml', {
            description: 'Markup for the migration landing page video embed',
            resolve: (source, args, ctx) => {
                // NOTE: embedded video is not always a part of the v9 - v10 migration experience
                // in the case of v1x - v13, we want to show an embedded video to users installing the major
                // version for the first time without going through the steps of the migration resolver, hence
                // why this lives in the root resolver but the migration context
                return ctx.migration.getVideoEmbedHtml();
            },
        });
    },
    sourceType: {
        module: '@packages/graphql',
        export: 'RemoteExecutionRoot',
    },
});
