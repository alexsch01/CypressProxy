"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.graphqlSchema = void 0;
const tslib_1 = require("tslib");
const path_1 = tslib_1.__importDefault(require("path"));
const nexus_1 = require("nexus");
const schemaTypes = tslib_1.__importStar(require("./schemaTypes/"));
const nexusNodePlugin_1 = require("./plugins/nexusNodePlugin");
const remoteSchemaWrapped_1 = require("./stitching/remoteSchemaWrapped");
const plugins_1 = require("./plugins");
const isCodegen = Boolean(process.env.CYPRESS_INTERNAL_NEXUS_CODEGEN);
// TODO: fix this with an update to esbuild: https://github.com/cypress-io/cypress/issues/23126
const types = Object.assign({}, schemaTypes, { default: undefined });
exports.graphqlSchema = (0, nexus_1.makeSchema)({
    types,
    shouldGenerateArtifacts: isCodegen,
    shouldExitAfterGenerateArtifacts: isCodegen,
    outputs: {
        typegen: {
            outputPath: path_1.default.join(__dirname, 'gen/nxs.gen.ts'),
            declareInputs: true,
        },
        schema: path_1.default.join(__dirname, '..', 'schemas', 'schema.graphql'),
    },
    contextType: {
        module: '@packages/data-context',
        export: 'DataContext',
    },
    mergeSchema: {
        schema: remoteSchemaWrapped_1.remoteSchemaWrapped,
        skipFields: {
            Mutation: ['test'],
        },
    },
    plugins: [
        // Structural Plugins
        (0, nexus_1.connectionPlugin)({
            nonNullDefaults: {
                output: true,
            },
        }),
        nexusNodePlugin_1.nodePlugin,
        plugins_1.remoteFieldPlugin,
        // Runtime Resolver Plugins
        plugins_1.nexusDeferResolveGuard,
        plugins_1.nexusSlowGuardPlugin,
        plugins_1.nexusDeferIfNotLoadedPlugin,
        plugins_1.nexusDebugLogPlugin,
        plugins_1.mutationErrorPlugin,
    ],
    formatTypegen(content, type) {
        if (type === 'schema') {
            return content;
        }
        // TODO(tim): fix in nexus to prevent the regex
        return `/* eslint-disable */\n${content.replace(/\.js"/g, '"')}`;
    },
    features: {
        abstractTypeRuntimeChecks: false,
    },
});
