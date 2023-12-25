"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.remoteFieldPlugin = void 0;
const tslib_1 = require("tslib");
const dedent_1 = tslib_1.__importDefault(require("dedent"));
const nexus_1 = require("nexus");
const graphql_resolve_batch_1 = require("graphql-resolve-batch");
const schemaTypes_1 = require("../schemaTypes");
exports.remoteFieldPlugin = (0, nexus_1.plugin)({
    name: 'remoteFieldPlugin',
    description: 'Adds a container for an independently fetchable remote-resolved field',
    fieldDefTypes: [
        nexus_1.core.printedGenTypingImport({
            module: '@packages/graphql/src/plugins/nexusRemoteFieldPlugin',
            bindings: ['RemoteFieldDefinitionConfig'],
        }),
        nexus_1.core.printedGenTypingImport({
            module: '@packages/graphql/src/gen/cloud-source-types.gen',
            bindings: [['Query', 'CloudQuery']],
        }),
    ],
    onInstall(b) {
        b.addType((0, nexus_1.mutationField)('loadRemoteFetchables', {
            description: 'Fetches the remote data for a RemoteFetchable ID',
            type: (0, nexus_1.nonNull)((0, nexus_1.list)('RemoteFetchable')),
            args: {
                ids: (0, nexus_1.nonNull)((0, nexus_1.list)((0, nexus_1.nonNull)((0, nexus_1.idArg)({
                    description: 'The identifier for the RemoteFetchable we are loading',
                })))),
            },
            resolve: (source, args, ctx, info) => {
                // Each ID encodes all of the information necessary to resolve a remote fetchable,
                // we just need to unpack them and execute
                return args.ids.map((id) => ctx.remoteRequest.loadRemoteFetchable(id, ctx));
            },
        }));
        b.addType((0, nexus_1.dynamicOutputMethod)({
            name: 'remoteField',
            typeDescription: (0, dedent_1.default) `
        Adds a field which is resolved with data from from the Cloud API.
        The "id" is refetchable via the loadRemoteFetchables APIs
      `,
            typeDefinition: (0, dedent_1.default) `
        <FieldName extends string, RemoteField extends Exclude<keyof CloudQuery, '__typename' | undefined>>(fieldName: FieldName, config: RemoteFieldDefinitionConfig<TypeName, FieldName, RemoteField>): void
      `,
            factory({ typeName: parentTypeName, typeDef: t, args: factoryArgs, stage, builder, wrapping }) {
                var _a, _b;
                const [fieldName, fieldConfig] = factoryArgs;
                const fieldType = `RemoteFetchable${fieldConfig.type}`;
                if (!builder.hasType(fieldType)) {
                    builder.addType((0, nexus_1.objectType)({
                        name: fieldType,
                        description: `Wrapper for the resolution remote ${fieldType} data`,
                        definition(t) {
                            t.implements(schemaTypes_1.RemoteFetchable);
                            t.nonNull.id('id', {
                                description: 'This ID is generated based on hashes of the queried data, and should be passed to the loadRemoteFetchables mutation to initiate loading the remote data',
                                resolve: (source, args, ctx) => ctx.remoteRequest.makeRefetchableId(fieldType, source.operationHash, source.operationVariables),
                            });
                            t.field('data', {
                                description: `Data resolved for the ${fieldType} from the cloud`,
                                type: fieldConfig.type,
                            });
                        },
                    }));
                }
                t.field(fieldName, {
                    type: fieldType,
                    description: (_a = fieldConfig.description) !== null && _a !== void 0 ? _a : 'Wrapper for resolving remote data associated with this field',
                    args: {
                        ...(_b = fieldConfig.args) !== null && _b !== void 0 ? _b : {},
                        name: (0, nexus_1.nonNull)((0, nexus_1.stringArg)({ description: 'A globally unique name for this field' })),
                    },
                    // Wrap with a batch resolver, so we aren't doing the same info parsing for each row
                    resolve: (0, graphql_resolve_batch_1.createBatchResolver)((sources, args, ctx, info) => {
                        return ctx.remoteRequest.batchResolveRemoteFields(fieldConfig, sources, args, ctx, info);
                    }),
                });
            },
        }));
    },
});
