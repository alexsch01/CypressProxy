"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.remoteSchemaWrapped = void 0;
const tslib_1 = require("tslib");
const delegate_1 = require("@graphql-tools/delegate");
const wrap_1 = require("@graphql-tools/wrap");
const assert_1 = tslib_1.__importDefault(require("assert"));
const debug_1 = tslib_1.__importDefault(require("debug"));
const graphql_1 = require("graphql");
const remoteSchema_1 = require("./remoteSchema");
const debug = (0, debug_1.default)('cypress:graphql:remoteSchemaWrapped');
// Takes the remote schema & wraps with an "executor", allowing us to delegate
// queries we know should be executed against this server
exports.remoteSchemaWrapped = (0, wrap_1.wrapSchema)({
    schema: remoteSchema_1.remoteSchema,
    createProxyingResolver: ({ subschemaConfig, operation, transformedSchema, }) => {
        return (source, args, context, info) => {
            return (0, delegate_1.delegateToSchema)({
                rootValue: source,
                schema: subschemaConfig,
                operation,
                transformedSchema,
                context,
                info,
            });
        };
    },
    executor: (obj) => {
        var _a, _b, _c, _d;
        const info = obj.info;
        (0, assert_1.default)((_a = obj.context) === null || _a === void 0 ? void 0 : _a.cloud, 'Cannot execute without a DataContext');
        (0, assert_1.default)(info, 'Cannot execute without GraphQLResolveInfo');
        const operationName = obj.context.cloud.makeOperationName(info);
        const requestPolicy = (_c = ((_b = obj.rootValue) !== null && _b !== void 0 ? _b : {}).requestPolicy) !== null && _c !== void 0 ? _c : 'cache-first';
        debug('executing: %j', { rootValue: obj.rootValue, operationName, requestPolicy });
        const operationDoc = (0, graphql_1.visit)(obj.document, {
            OperationDefinition(node) {
                if (!node.name) {
                    return {
                        ...node, name: { kind: 'Name', value: operationName },
                    };
                }
                return graphql_1.BREAK;
            },
        });
        const context = obj.context;
        return context.cloud.executeRemoteGraphQL({
            fieldName: info.fieldName,
            requestPolicy,
            operationType: (_d = obj.operationType) !== null && _d !== void 0 ? _d : 'query',
            operationDoc,
            operationVariables: obj.variables,
            // When we respond eagerly with a result, but receive an updated value
            // for the query, we can "push" the data down using the pushFragment subscription
            onUpdatedResult(result) {
                var _a;
                context.graphql.pushResult({
                    result: (_a = result === null || result === void 0 ? void 0 : result[info.fieldName]) !== null && _a !== void 0 ? _a : null,
                    source: obj.rootValue,
                    info,
                    ctx: context,
                });
            },
        });
    },
});
