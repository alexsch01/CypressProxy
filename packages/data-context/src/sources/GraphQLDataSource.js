"use strict";
var _GraphQLDataSource_instances, _GraphQLDataSource_proxyWithTypeName, _GraphQLDataSource_delegateNodeToCloud, _GraphQLDataSource_base64Decode, _GraphQLDataSource_pushFragment, _GraphQLDataSource_makeRootValue;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GraphQLDataSource = void 0;
const tslib_1 = require("tslib");
const debug_1 = tslib_1.__importDefault(require("debug"));
const graphql_1 = require("graphql");
const lodash_1 = tslib_1.__importDefault(require("lodash"));
const DocumentNodeBuilder_1 = require("../util/DocumentNodeBuilder");
const debug = (0, debug_1.default)('cypress:data-context:sources:GraphQLDataSource');
const RESOLVED_SOURCE = Symbol('RESOLVED_SOURCE');
class GraphQLDataSource {
    constructor() {
        _GraphQLDataSource_instances.add(this);
        this.RESOLVED_SOURCE = RESOLVED_SOURCE;
    }
    resolveNode(nodeId, ctx, info) {
        const [typeName] = tslib_1.__classPrivateFieldGet(this, _GraphQLDataSource_instances, "m", _GraphQLDataSource_base64Decode).call(this, nodeId).split(':');
        if (typeName === null || typeName === void 0 ? void 0 : typeName.startsWith('Cloud')) {
            return tslib_1.__classPrivateFieldGet(this, _GraphQLDataSource_instances, "m", _GraphQLDataSource_delegateNodeToCloud).call(this, nodeId, ctx, info);
        }
        switch (typeName) {
            case 'CurrentProject':
                return tslib_1.__classPrivateFieldGet(this, _GraphQLDataSource_instances, "m", _GraphQLDataSource_proxyWithTypeName).call(this, 'CurrentProject', ctx.lifecycleManager);
            default:
                throw new Error(`Unable to read node for ${typeName}. Add a handler to GraphQLDataSource`);
        }
    }
    invalidateClientUrqlCache(ctx) {
        ctx.emitter.pushFragment([{
                data: null,
                errors: [],
                target: 'Query',
                fragment: '{}',
                invalidateCache: true,
            }]);
    }
    pushResult({ source, info, ctx, result }) {
        if (info.parentType.name === 'Query') {
            tslib_1.__classPrivateFieldGet(this, _GraphQLDataSource_instances, "m", _GraphQLDataSource_pushFragment).call(this, { result, ctx, info });
            return;
        }
        // If it's a node, we can query as a Node field and push down the result that way
        if (info.parentType.getInterfaces().some((i) => i.name === 'Node') && (result.id || ['CloudProjectUnauthorized', 'CloudProjectNotFound'].includes(result.__typename))) {
            tslib_1.__classPrivateFieldGet(this, _GraphQLDataSource_instances, "m", _GraphQLDataSource_pushFragment).call(this, { ctx, info, source, result }, true);
            return;
        }
    }
}
exports.GraphQLDataSource = GraphQLDataSource;
_GraphQLDataSource_instances = new WeakSet(), _GraphQLDataSource_proxyWithTypeName = function _GraphQLDataSource_proxyWithTypeName(typename, obj) {
    // Ensure that we have __typename provided to handle the
    return new Proxy(obj, {
        get(target, prop, receiver) {
            if (prop === '__typename') {
                return typename;
            }
            return Reflect.get(target, prop, receiver);
        },
    });
}, _GraphQLDataSource_delegateNodeToCloud = function _GraphQLDataSource_delegateNodeToCloud(nodeId, ctx, info) {
    const filteredNodes = info.fieldNodes.map((node) => {
        return (0, graphql_1.visit)(node, {
            Field(node) {
                if (node.name.value === 'node') {
                    return { ...node, name: { kind: 'Name', value: 'cloudNode' } };
                }
                return;
            },
            InlineFragment: (node) => {
                // Remove any non-cloud types from the node
                if (node.typeCondition && !ctx.config.schemaCloud.getType(node.typeCondition.name.value)) {
                    return null;
                }
                return;
            },
        });
    });
    // Execute the node field against the cloud schema
    return (0, graphql_1.execute)({
        schema: ctx.config.schemaCloud,
        contextValue: ctx,
        variableValues: info.variableValues,
        document: {
            kind: 'Document',
            definitions: [
                {
                    kind: 'OperationDefinition',
                    operation: 'query',
                    selectionSet: {
                        kind: 'SelectionSet',
                        selections: filteredNodes,
                    },
                },
            ],
        },
    });
}, _GraphQLDataSource_base64Decode = function _GraphQLDataSource_base64Decode(str) {
    return Buffer.from(str, 'base64').toString('utf8');
}, _GraphQLDataSource_pushFragment = function _GraphQLDataSource_pushFragment(params, isNode = false) {
    var _a, _b;
    const docBuilder = new DocumentNodeBuilder_1.DocumentNodeBuilder({
        isNode,
        parentType: params.info.parentType,
        fieldNodes: params.info.fieldNodes,
        variableDefinitions: params.info.operation.variableDefinitions,
        operationName: (_b = (_a = params.info.operation.name) === null || _a === void 0 ? void 0 : _a.value) !== null && _b !== void 0 ? _b : params.info.fieldNodes.map((n) => n.name.value).sort().join('_'),
    });
    Promise.resolve((0, graphql_1.execute)({
        schema: params.info.schema,
        document: isNode ? docBuilder.queryNode : docBuilder.query,
        variableValues: params.info.variableValues,
        rootValue: tslib_1.__classPrivateFieldGet(this, _GraphQLDataSource_instances, "m", _GraphQLDataSource_makeRootValue).call(this, params, isNode, params.source),
        contextValue: params.ctx,
    })).then((result) => {
        var _a;
        debug(`pushFragment value %j`, result);
        const data = isNode ? (_a = result.data) === null || _a === void 0 ? void 0 : _a.node : result.data;
        // Take the result from executing the query, and push it down to the client
        // along with a fragment representing the part of the graph we're updating
        params.ctx.emitter.pushFragment([{
                target: params.info.parentType.name,
                fragment: (0, graphql_1.print)(docBuilder.clientWriteFragment),
                variables: lodash_1.default.pick(params.info.variableValues, docBuilder.variableNames),
                data,
                errors: result.errors,
            }]);
    }).catch((e) => {
        params.ctx.emitter.pushFragment([{
                target: params.info.parentType.name,
                fragment: (0, graphql_1.print)(docBuilder.clientWriteFragment),
                variables: lodash_1.default.pick(params.info.variableValues, docBuilder.variableNames),
                data: null,
                errors: [e],
            }]);
        debug(`pushFragment execution error %o`, e);
    });
}, _GraphQLDataSource_makeRootValue = function _GraphQLDataSource_makeRootValue(params, node, nodeSource) {
    // If we're resolving a node, we have a field named "node", with the resolved value
    // conforming to the "node" resolver
    if (node) {
        return {
            [RESOLVED_SOURCE]: true,
            node: new Proxy(nodeSource, {
                get(target, p, receiver) {
                    if (p === '__typename') {
                        return params.info.parentType.name;
                    }
                    return Reflect.get(target, p, receiver);
                },
            }),
        };
    }
    return {
        [RESOLVED_SOURCE]: true,
        [params.info.fieldName]: params.result,
    };
};
