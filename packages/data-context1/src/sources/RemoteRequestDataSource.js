"use strict";
var _RemoteRequestDataSource_instances, _RemoteRequestDataSource_operationErrors, _RemoteRequestDataSource_operationRegistry, _RemoteRequestDataSource_operationRegistryPushToFrontend, _RemoteRequestDataSource_maybeResolveFetchable, _RemoteRequestDataSource_executeRemote, _RemoteRequestDataSource_atob, _RemoteRequestDataSource_btoa, _RemoteRequestDataSource_makeRemoteOperation, _RemoteRequestDataSource_sha1, _RemoteRequestDataSource_getReferencedVariables, _RemoteRequestDataSource_getDataFieldNodes, _RemoteRequestDataSource_makeOperationDoc;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RemoteRequestDataSource = void 0;
const tslib_1 = require("tslib");
const core_1 = require("@urql/core");
const graphql_1 = require("graphql");
const crypto_1 = tslib_1.__importDefault(require("crypto"));
const lodash_1 = tslib_1.__importDefault(require("lodash"));
const Path_1 = require("graphql/jsutils/Path");
const assert_1 = tslib_1.__importDefault(require("assert"));
const util_1 = require("../util");
class RemoteRequestDataSource {
    constructor() {
        _RemoteRequestDataSource_instances.add(this);
        _RemoteRequestDataSource_operationErrors.set(this, new Map()
        /** The remote execution definition for the query */
        );
        /** The remote execution definition for the query */
        _RemoteRequestDataSource_operationRegistry.set(this, new Map()
        /**
         * Map<HASH_OF_QUERY, [FRONTEND_QUERY, VARIABLE_NAMES[]]>
         */
        );
        /**
         * Map<HASH_OF_QUERY, [FRONTEND_QUERY, VARIABLE_NAMES[]]>
         */
        _RemoteRequestDataSource_operationRegistryPushToFrontend.set(this, new Map()
        /**
         * Given a RemoteFetchable "id", we look up the operation & resolve and/or
         * execute if it hasn't been fetched yet. Assumes the ID has already been
         * registered via a call to batchResolveRemoteFields
         */
        );
    }
    /**
     * Given a RemoteFetchable "id", we look up the operation & resolve and/or
     * execute if it hasn't been fetched yet. Assumes the ID has already been
     * registered via a call to batchResolveRemoteFields
     */
    loadRemoteFetchable(id, ctx) {
        const { name, operationHash, operationVariables } = this.unpackFetchableNodeId(id);
        const operationResult = tslib_1.__classPrivateFieldGet(this, _RemoteRequestDataSource_operationRegistry, "f").get(operationHash);
        if (!operationResult) {
            return Promise.reject(`Unable to execute RemoteFetchable for ${atob(id)}, are you sure you're using an ID that already came back from a resolved query?`);
        }
        const { operation, operationDoc, remoteQueryField } = operationResult;
        return tslib_1.__classPrivateFieldGet(this, _RemoteRequestDataSource_instances, "m", _RemoteRequestDataSource_maybeResolveFetchable).call(this, {
            ctx,
            __typename: name,
            id,
            operation,
            operationDoc,
            operationHash,
            operationVariables,
            remoteQueryField,
            shouldFetch: true,
            isMutation: true,
            shouldBatch: true,
        });
    }
    unpackFetchableNodeId(id) {
        const bufferString = tslib_1.__classPrivateFieldGet(this, _RemoteRequestDataSource_instances, "m", _RemoteRequestDataSource_atob).call(this, id);
        const [name, operationHash, encodedArgs] = bufferString.split(':');
        const operationVariables = JSON.parse(tslib_1.__classPrivateFieldGet(this, _RemoteRequestDataSource_instances, "m", _RemoteRequestDataSource_atob).call(this, encodedArgs));
        return {
            name,
            operationHash,
            operationVariables,
        };
    }
    makeRefetchableId(fieldType, operationHash, operationVariables) {
        return tslib_1.__classPrivateFieldGet(this, _RemoteRequestDataSource_instances, "m", _RemoteRequestDataSource_btoa).call(this, `${fieldType}:${operationHash}:${tslib_1.__classPrivateFieldGet(this, _RemoteRequestDataSource_instances, "m", _RemoteRequestDataSource_btoa).call(this, (0, core_1.stringifyVariables)(operationVariables))}`);
    }
    batchResolveRemoteFields(fieldConfig, sources, args, ctx, info) {
        const fieldType = `RemoteFetchable${fieldConfig.type}`;
        let operationDef = null;
        return sources.map(async (source, i) => {
            var _a, _b, _c, _d, _e, _f, _g;
            if (!operationDef) {
                operationDef = tslib_1.__classPrivateFieldGet(this, _RemoteRequestDataSource_instances, "m", _RemoteRequestDataSource_makeRemoteOperation).call(this, fieldConfig, ctx, info);
                if (!tslib_1.__classPrivateFieldGet(this, _RemoteRequestDataSource_operationRegistry, "f").has(operationDef.operationHash)) {
                    const FIELDS_TO_PUSH = ['id', 'status', 'error', 'data'];
                    const docBuilder = new util_1.DocumentNodeBuilder({
                        isNode: true,
                        isRemoteFetchable: true,
                        parentType: info.schema.getType(fieldType),
                        fieldNodes: (_b = (_a = info.fieldNodes[0]) === null || _a === void 0 ? void 0 : _a.selectionSet) === null || _b === void 0 ? void 0 : _b.selections.filter((f) => f.kind === 'Field' && FIELDS_TO_PUSH.includes(f.name.value)),
                        variableDefinitions: info.operation.variableDefinitions,
                        operationName: (_d = (_c = info.operation.name) === null || _c === void 0 ? void 0 : _c.value) !== null && _d !== void 0 ? _d : info.fieldNodes.map((n) => n.name.value).sort().join('_'),
                    });
                    tslib_1.__classPrivateFieldGet(this, _RemoteRequestDataSource_operationRegistry, "f").set(operationDef.operationHash, operationDef);
                    tslib_1.__classPrivateFieldGet(this, _RemoteRequestDataSource_operationRegistryPushToFrontend, "f").set(operationDef.operationHash, [(0, graphql_1.print)(docBuilder.clientWriteFragment), docBuilder.variableNames]);
                }
            }
            const { operation, operationDoc, operationHash } = operationDef;
            const operationVariables = {};
            const queryArgs = fieldConfig.queryArgs;
            if (typeof queryArgs === 'function') {
                const queryArgResult = await queryArgs(source, args, ctx, info);
                // If we explicitly return false from queryArgs, we aren't fetching
                if (queryArgResult === false) {
                    return null;
                }
                for (const [key, val] of Object.entries(queryArgResult)) {
                    if (operationDef.fieldArgMapping[key]) {
                        operationVariables[key] = val;
                    }
                }
            }
            for (const [name] of operationDef.operationVariableDefs) {
                (_e = operationVariables[name]) !== null && _e !== void 0 ? _e : (operationVariables[name] = (_f = info.variableValues[name]) !== null && _f !== void 0 ? _f : null);
            }
            const shouldEagerFetch = typeof fieldConfig.shouldEagerFetch === 'function'
                ? fieldConfig.shouldEagerFetch(source, args, ctx, info, i)
                : (_g = fieldConfig.shouldEagerFetch) !== null && _g !== void 0 ? _g : false;
            const id = this.makeRefetchableId(fieldType, operationDef.operationHash, operationVariables);
            return tslib_1.__classPrivateFieldGet(this, _RemoteRequestDataSource_instances, "m", _RemoteRequestDataSource_maybeResolveFetchable).call(this, {
                ctx,
                __typename: fieldType,
                id,
                operation,
                operationDoc,
                operationHash,
                operationVariables,
                shouldFetch: shouldEagerFetch,
                remoteQueryField: fieldConfig.remoteQueryField,
                isMutation: false,
                shouldBatch: true,
            });
        });
    }
}
exports.RemoteRequestDataSource = RemoteRequestDataSource;
_RemoteRequestDataSource_operationErrors = new WeakMap(), _RemoteRequestDataSource_operationRegistry = new WeakMap(), _RemoteRequestDataSource_operationRegistryPushToFrontend = new WeakMap(), _RemoteRequestDataSource_instances = new WeakSet(), _RemoteRequestDataSource_maybeResolveFetchable = function _RemoteRequestDataSource_maybeResolveFetchable(params) {
    var _a;
    const { ctx, shouldFetch, ...partialResult } = params;
    if (ctx.cloud.isResolving(params)) {
        return {
            ...partialResult,
            fetchingStatus: 'FETCHING',
        };
    }
    const errored = tslib_1.__classPrivateFieldGet(this, _RemoteRequestDataSource_operationErrors, "f").get(params.id);
    if (errored) {
        // If we're fetching, and we've errored, refetch if we're in a mutation,
        // otherwise it'll just seem like it's fetching forever
        if (shouldFetch && params.isMutation) {
            tslib_1.__classPrivateFieldGet(this, _RemoteRequestDataSource_instances, "m", _RemoteRequestDataSource_executeRemote).call(this, params);
            return {
                ...partialResult,
                fetchingStatus: 'FETCHING',
            };
        }
        return {
            ...partialResult,
            fetchingStatus: 'ERRORED',
            error: { ...errored },
        };
    }
    const cachedData = ctx.cloud.readFromCache(params);
    // If we have stale data, or we should fetch - fetch the data
    if ((cachedData === null || cachedData === void 0 ? void 0 : cachedData.stale) || shouldFetch) {
        // Otherwise, fetch it
        tslib_1.__classPrivateFieldGet(this, _RemoteRequestDataSource_instances, "m", _RemoteRequestDataSource_executeRemote).call(this, params);
        return {
            ...partialResult,
            fetchingStatus: 'FETCHING',
        };
    }
    if (cachedData) {
        // If we have the data, but it's marked as stale (meaning this is a partial eager response)
        if (cachedData.stale) {
            // If we're not fetching, say it's not fetched but put the data under dataRaw for debugging
            return {
                ...partialResult,
                fetchingStatus: 'NOT_FETCHED',
                dataRaw: cachedData.data,
            };
        }
        // Otherwise, mark as fetched
        return {
            ...partialResult,
            fetchingStatus: 'FETCHED',
            data: (_a = cachedData.data) === null || _a === void 0 ? void 0 : _a[params.remoteQueryField],
            dataRaw: cachedData.data,
        };
    }
    if (!shouldFetch) {
        return {
            ...partialResult,
            fetchingStatus: 'NOT_FETCHED',
        };
    }
    // Otherwise, fetch it
    tslib_1.__classPrivateFieldGet(this, _RemoteRequestDataSource_instances, "m", _RemoteRequestDataSource_executeRemote).call(this, params);
    return {
        ...partialResult,
        fetchingStatus: 'FETCHING',
    };
}, _RemoteRequestDataSource_executeRemote = function _RemoteRequestDataSource_executeRemote(params) {
    const { ctx, operationDoc, operationHash, operationVariables, remoteQueryField } = params;
    Promise.resolve(ctx.cloud.executeRemoteGraphQL({
        fieldName: remoteQueryField,
        operationDoc,
        operationHash,
        operationVariables,
        requestPolicy: 'network-only',
        shouldBatch: params.shouldBatch,
    }))
        .then((result) => {
        const toPushDefinition = tslib_1.__classPrivateFieldGet(this, _RemoteRequestDataSource_operationRegistryPushToFrontend, "f").get(operationHash);
        (0, assert_1.default)(toPushDefinition, `Missing fragment for ${operationHash}`);
        const [toSend, variableNames] = toPushDefinition;
        let data = null;
        let error = null;
        let fetchingStatus = 'FETCHED';
        if (result.error) {
            fetchingStatus = 'ERRORED';
            error = { ...result.error };
            tslib_1.__classPrivateFieldGet(this, _RemoteRequestDataSource_operationErrors, "f").set(params.id, result.error);
        }
        else if (result.data) {
            data = result.data[params.remoteQueryField];
            tslib_1.__classPrivateFieldGet(this, _RemoteRequestDataSource_operationErrors, "f").delete(params.id);
        }
        if (data || error) {
            ctx.emitter.pushFragment([{
                    target: params.__typename,
                    fragment: toSend,
                    variables: lodash_1.default.pick(operationVariables, variableNames),
                    data: {
                        id: params.id,
                        fetchingStatus,
                        data,
                        error,
                    },
                    errors: result.errors,
                }]);
        }
    })
        .catch((e) => {
        ctx.logTraceError(e);
    });
}, _RemoteRequestDataSource_atob = function _RemoteRequestDataSource_atob(encoded) {
    return Buffer.from(encoded, 'base64').toString('utf8');
}, _RemoteRequestDataSource_btoa = function _RemoteRequestDataSource_btoa(unencoded) {
    return Buffer.from(unencoded, 'utf8').toString('base64');
}, _RemoteRequestDataSource_makeRemoteOperation = function _RemoteRequestDataSource_makeRemoteOperation(fieldConfig, ctx, info) {
    var _a, _b;
    const fieldNodes = tslib_1.__classPrivateFieldGet(this, _RemoteRequestDataSource_instances, "m", _RemoteRequestDataSource_getDataFieldNodes).call(this, info);
    const referencedVariableValues = tslib_1.__classPrivateFieldGet(this, _RemoteRequestDataSource_instances, "m", _RemoteRequestDataSource_getReferencedVariables).call(this, fieldNodes, (_a = info.operation.variableDefinitions) !== null && _a !== void 0 ? _a : []);
    const queryFieldDef = (_b = ctx.config.schemaCloud.getQueryType()) === null || _b === void 0 ? void 0 : _b.getFields()[fieldConfig.remoteQueryField];
    (0, assert_1.default)(queryFieldDef, `Unknown remote query field ${fieldConfig.remoteQueryField}`);
    const remoteFieldArgs = queryFieldDef.args;
    const operationVariableDefs = [];
    const fieldArgs = [];
    const fieldArgMapping = {};
    // Add the outer variables to thq query
    for (const [referencedVar, variableDef] of Object.entries(referencedVariableValues)) {
        operationVariableDefs.push([referencedVar, variableDef]);
    }
    // Come up with names for the inner variables, ensuring they don't conflict
    // with the outer variables
    for (const fieldArg of remoteFieldArgs) {
        let toName = fieldArg.name;
        while (referencedVariableValues[toName]) {
            toName += '_';
        }
        fieldArgMapping[fieldArg.name] = toName;
        operationVariableDefs.push([toName, { type: (0, graphql_1.parseType)(fieldArg.type.toString()) }]);
        const argVar = {
            kind: 'Variable',
            name: {
                kind: 'Name',
                value: toName,
            },
        };
        fieldArgs.push([toName, argVar]);
    }
    const operationDoc = tslib_1.__classPrivateFieldGet(this, _RemoteRequestDataSource_instances, "m", _RemoteRequestDataSource_makeOperationDoc).call(this, {
        fieldName: fieldConfig.remoteQueryField,
        fieldArgs,
        fieldNodes,
        operationVariableDefs,
    });
    const operation = (0, graphql_1.print)(operationDoc);
    const operationHash = tslib_1.__classPrivateFieldGet(this, _RemoteRequestDataSource_instances, "m", _RemoteRequestDataSource_sha1).call(this, operation);
    return {
        operation,
        operationDoc,
        operationHash,
        operationVariableDefs,
        fieldArgMapping,
        remoteQueryField: fieldConfig.remoteQueryField,
    };
}, _RemoteRequestDataSource_sha1 = function _RemoteRequestDataSource_sha1(str) {
    return crypto_1.default.createHash('sha1').update(str).digest('hex');
}, _RemoteRequestDataSource_getReferencedVariables = function _RemoteRequestDataSource_getReferencedVariables(selectionNodes, outerVariableDefs) {
    const variableDefinitions = {};
    selectionNodes.map((node) => {
        (0, graphql_1.visit)(node, {
            Variable(node) {
                var _a;
                const def = (_a = variableDefinitions[node.name.value]) !== null && _a !== void 0 ? _a : outerVariableDefs.find((d) => d.variable.name.value === node.name.value);
                (0, assert_1.default)(def, `Expected allVariableDefinitions for ${node.name.value}`);
                variableDefinitions[node.name.value] = def;
            },
        });
    });
    return variableDefinitions;
}, _RemoteRequestDataSource_getDataFieldNodes = function _RemoteRequestDataSource_getDataFieldNodes(info) {
    var _a, _b, _c, _d, _e;
    const dataSelection = (_b = (_a = info.fieldNodes[0]) === null || _a === void 0 ? void 0 : _a.selectionSet) === null || _b === void 0 ? void 0 : _b.selections.filter((s) => {
        return s.kind === 'Field' && s.name.value === 'data';
    });
    if (dataSelection.length > 1) {
        throw new Error(`Cannot alias the data field, at ${dataSelection === null || dataSelection === void 0 ? void 0 : dataSelection.map(graphql_1.print)}`);
    }
    const selections = (_d = (_c = dataSelection[0]) === null || _c === void 0 ? void 0 : _c.selectionSet) === null || _d === void 0 ? void 0 : _d.selections;
    if (!selections) {
        throw new Error(`Cannot resolve ${(_e = info.operation.name) === null || _e === void 0 ? void 0 : _e.value} without a selection for data, at: ${(0, Path_1.pathToArray)(info.path)}`);
    }
    return selections;
}, _RemoteRequestDataSource_makeOperationDoc = function _RemoteRequestDataSource_makeOperationDoc(params) {
    const { operationVariableDefs = [], fieldArgs = [] } = params;
    return {
        kind: 'Document',
        definitions: [
            {
                kind: 'OperationDefinition',
                operation: 'query',
                name: {
                    kind: 'Name',
                    value: `RemoteRequest_${params.fieldName}`,
                },
                variableDefinitions: operationVariableDefs.map((v) => {
                    return {
                        kind: 'VariableDefinition',
                        variable: {
                            kind: 'Variable',
                            name: { kind: 'Name', value: v[0] },
                        },
                        type: v[1].type,
                        defaultValue: v[1].defaultValue,
                    };
                }),
                selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                        {
                            kind: 'Field',
                            name: {
                                kind: 'Name',
                                value: params.fieldName,
                            },
                            arguments: fieldArgs.map((a) => {
                                return {
                                    kind: 'Argument',
                                    name: { kind: 'Name', value: a[0] },
                                    value: a[1],
                                };
                            }),
                            selectionSet: {
                                kind: 'SelectionSet',
                                selections: params.fieldNodes,
                            },
                        },
                    ],
                },
            },
        ],
    };
};
