"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CurrentProject = exports.PackageManagerEnum = void 0;
const tslib_1 = require("tslib");
const types_1 = require(process.argv[1]+"/../packages/types");
const nexus_1 = require("nexus");
const path_1 = tslib_1.__importDefault(require("path"));
const __1 = require("..");
const gql_WizardEnums_1 = require("../enumTypes/gql-WizardEnums");
const gql_Browser_1 = require("./gql-Browser");
const gql_CodeGenGlobs_1 = require("./gql-CodeGenGlobs");
const gql_FileParts_1 = require("./gql-FileParts");
const gql_ProjectPreferences_1 = require("./gql-ProjectPreferences");
const gql_Spec_1 = require("./gql-Spec");
exports.PackageManagerEnum = (0, nexus_1.enumType)({
    name: 'PackageManagerEnum',
    members: types_1.PACKAGE_MANAGERS,
});
exports.CurrentProject = (0, nexus_1.objectType)({
    name: 'CurrentProject',
    description: 'The currently opened Cypress project, represented by a cypress.config.{js,ts,mjs,cjs} file',
    node: 'projectRoot',
    definition(t) {
        t.implements('ProjectLike');
        t.nonNull.field('packageManager', {
            type: exports.PackageManagerEnum,
            resolve: (source, args, ctx) => ctx.coreData.packageManager,
        });
        t.boolean('isLoadingConfigFile', {
            description: 'Whether we are currently loading the configFile',
        });
        t.boolean('isLoadingNodeEvents', {
            description: 'Whether we are currently loading the setupNodeEvents',
        });
        t.boolean('isFullConfigReady', {
            description: 'Whether or not the full config is ready',
        });
        t.boolean('hasNonExampleSpec', {
            description: 'Whether the project has any specs found that do not match an example spec',
            resolve: (_, args, ctx) => ctx.project.hasNonExampleSpec,
        });
        t.field('currentTestingType', {
            description: 'The mode the interactive runner was launched in',
            type: gql_WizardEnums_1.TestingTypeEnum,
            resolve: (_, args, ctx) => ctx.coreData.currentTestingType,
        });
        t.field('activeBrowser', {
            type: gql_Browser_1.Browser,
            description: 'The currently selected browser for the project',
            resolve: (source, args, ctx) => {
                return ctx.coreData.activeBrowser;
            },
        });
        t.list.nonNull.field('browsers', {
            type: gql_Browser_1.Browser,
            description: 'Browsers found that are compatible with Cypress',
        });
        t.field('cloudProject', {
            type: 'CloudProjectResult',
            description: 'The remote associated project from Cypress Cloud',
            resolve: async (source, args, ctx, info) => {
                const projectId = await ctx.project.projectId();
                if (!projectId) {
                    return null;
                }
                return ctx.cloud.delegateCloudField({
                    field: 'cloudProjectBySlug',
                    args: { slug: projectId },
                    ctx,
                    info,
                });
            },
        });
        t.string('projectId', {
            description: 'Used to associate project with Cypress Cloud',
            resolve: (source, args, ctx) => ctx.project.projectId(),
        });
        t.boolean('isCTConfigured', {
            description: 'Whether the user configured this project to use Component Testing',
            resolve: (source, args, ctx) => {
                var _a;
                // If the forceReconfigureProject for component is set, we want to notify
                // the client side that the wizard has to start from the beginning
                if ((_a = ctx.coreData.forceReconfigureProject) === null || _a === void 0 ? void 0 : _a.component) {
                    return false;
                }
                return ctx.lifecycleManager.isTestingTypeConfigured('component');
            },
        });
        t.boolean('isE2EConfigured', {
            description: 'Whether the user configured this project to use e2e Testing',
            resolve: (source, args, ctx) => {
                var _a;
                // If the forceReconfigureProject for e2e is set, we want to notify
                // the client side that the wizard has to start from the beginning
                if ((_a = ctx.coreData.forceReconfigureProject) === null || _a === void 0 ? void 0 : _a.e2e) {
                    return false;
                }
                return ctx.lifecycleManager.isTestingTypeConfigured('e2e');
            },
        });
        t.boolean('needsLegacyConfigMigration', {
            description: 'Whether the project needs to be migrated before proceeding',
            resolve(source, args, ctx) {
                return ctx.migration.needsCypressJsonMigration();
            },
        });
        t.boolean('hasValidConfigFile', {
            description: 'Whether the project has a valid config file',
            resolve(source, args, ctx) {
                return ctx.lifecycleManager.metaState.hasValidConfigFile;
            },
        });
        t.boolean('isUsingTypeScript', {
            description: 'Whether the project has Typescript',
            resolve(source, args, ctx) {
                return ctx.lifecycleManager.metaState.isUsingTypeScript;
            },
        });
        t.field('fileExtensionToUse', {
            type: __1.FileExtensionEnum,
            description: 'File extension to use based on if the project has typescript or not',
            resolve: (source, args, ctx) => {
                return ctx.lifecycleManager.fileExtensionToUse;
            },
        });
        t.string('defaultSpecFileName', {
            description: 'Default spec file name for spec creation, nullable so we can throw if it can\'t be decided',
            resolve: (source, args, ctx) => {
                return ctx.project.defaultSpecFileName();
            },
        });
        t.nonNull.list.nonNull.field('specs', {
            description: 'A list of specs for the currently open testing type of a project',
            type: gql_Spec_1.Spec,
            resolve: (source, args, ctx) => {
                return ctx.project.specs;
            },
        });
        t.nonNull.json('config', {
            description: 'Project configuration',
            resolve: (source, args, ctx) => {
                return ctx.project.getResolvedConfigFields();
            },
        });
        t.nonNull.json('serveConfig', {
            description: 'base64 encoded config used on the runner page',
            resolve: (source, args, ctx) => {
                return ctx.html.makeServeConfig();
            },
        });
        t.json('savedState', {
            description: 'Project saved state',
            resolve: (source, args, ctx) => {
                return ctx.project.getCurrentProjectSavedState();
            },
        });
        t.string('configFile', {
            description: 'Config File, specified by the CLI or ',
            resolve: (source, args, ctx) => {
                return ctx.lifecycleManager.configFile.toString();
            },
        });
        t.string('configFileAbsolutePath', {
            description: 'Config File Absolute Path',
            resolve: async (source, args, ctx) => {
                return ctx.lifecycleManager.configFilePath;
            },
        });
        t.field('preferences', {
            type: gql_ProjectPreferences_1.ProjectPreferences,
            description: 'Cached preferences for this project',
            resolve: (source, args, ctx) => {
                return ctx.project.getProjectPreferences(path_1.default.basename(source.projectRoot));
            },
        });
        t.string('codeGenFramework', {
            resolve: (src, args, ctx) => {
                var _a;
                return ((_a = ctx.actions.codegen.getWizardFrameworkFromConfig()) === null || _a === void 0 ? void 0 : _a.codeGenFramework) || null;
            },
        });
        t.nonNull.field('codeGenGlobs', {
            type: gql_CodeGenGlobs_1.CodeGenGlobs,
            resolve: (src, args, ctx) => ctx.project.getCodeGenGlobs(),
        });
        t.list.field('codeGenCandidates', {
            type: gql_FileParts_1.FileParts,
            description: 'List of all code generation candidates stories',
            args: {
                glob: (0, nexus_1.nonNull)((0, nexus_1.stringArg)()),
            },
            resolve: (source, args, ctx) => {
                return ctx.project.getCodeGenCandidates(args.glob);
            },
        });
        t.string('branch', {
            description: 'The current branch of the project',
            resolve: async (source, args, ctx) => {
                var _a, _b;
                return (_b = (_a = source.git) === null || _a === void 0 ? void 0 : _a.currentBranch) !== null && _b !== void 0 ? _b : null;
            },
        });
        t.nonNull.boolean('isDefaultSpecPattern', {
            description: 'True if the project is using the default spec pattern',
            resolve: async (source, args, ctx) => ctx.project.getIsDefaultSpecPattern(),
        });
        t.nonNull.field('browserStatus', {
            type: __1.BrowserStatusEnum,
            description: 'If the browser is open or not',
            resolve: (source, args, ctx) => ctx.coreData.app.browserStatus,
        });
    },
    sourceType: {
        module: '@packages/data-context/src/data/ProjectLifecycleManager',
        export: 'ProjectLifecycleManager',
    },
});
