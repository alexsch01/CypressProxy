"use strict";
var _CloudDataSource_instances, _CloudDataSource_cloudUrqlClient, _CloudDataSource_lastCache, _CloudDataSource_batchExecutor, _CloudDataSource_batchExecutorBatcher, _CloudDataSource_user_get, _CloudDataSource_additionalHeaders, _CloudDataSource_pendingPromises, _CloudDataSource_hashRemoteRequest, _CloudDataSource_sha1, _CloudDataSource_formatWithErrors, _CloudDataSource_maybeQueueDeferredExecute, _CloudDataSource_executeQuery, _CloudDataSource_makeBatchExecutionBatcher, _CloudDataSource_ensureError;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CloudDataSource = void 0;
const tslib_1 = require("tslib");
// @ts-ignore
const root_1 = tslib_1.__importDefault(require(process.argv[1]+"/../packages/root"));
const debug_1 = tslib_1.__importDefault(require("debug"));
const dataloader_1 = tslib_1.__importDefault(require("dataloader"));
const batch_execute_1 = require("@graphql-tools/batch-execute");
const exchange_graphcache_1 = require("@urql/exchange-graphcache");
const cross_fetch_1 = require("cross-fetch");
const crypto_1 = tslib_1.__importDefault(require("crypto"));
const getenv_1 = tslib_1.__importDefault(require("getenv"));
const graphql_1 = require("graphql");
const core_1 = require("@urql/core");
const lodash_1 = tslib_1.__importDefault(require("lodash"));
const delegate_1 = require("@graphql-tools/delegate");
const urqlCacheKeys_1 = require("../util/urqlCacheKeys");
//const urql_introspection_gen_1 = require("../gen/urql-introspection.gen");
const Path_1 = require("graphql/jsutils/Path");
const debug = (0, debug_1.default)('cypress:data-context:sources:CloudDataSource');
const cloudEnv = (0, getenv_1.default)('CYPRESS_INTERNAL_CLOUD_ENV', process.env.CYPRESS_INTERNAL_ENV || 'development');
const REMOTE_SCHEMA_URLS = {
    staging: 'https://cloud-staging.cypress.io',
    development: 'http://localhost:3000',
    production: 'https://cloud.cypress.io',
};
/**
 * The CloudDataSource manages the interaction with the remote GraphQL server
 * It maintains a normalized cache of all data we have seen from the cloud and
 * ensures the data is kept up-to-date as it changes
 */
class CloudDataSource {
    constructor(params) {
        _CloudDataSource_instances.add(this);
        this.params = params;
        _CloudDataSource_cloudUrqlClient.set(this, void 0);
        _CloudDataSource_lastCache.set(this, void 0);
        _CloudDataSource_batchExecutor.set(this, void 0);
        _CloudDataSource_batchExecutorBatcher.set(this, void 0);
        _CloudDataSource_pendingPromises.set(this, new Map());
        _CloudDataSource_formatWithErrors.set(this, async (data) => {
            var _a, _b, _c;
            // If we receive a 401 from Cypress Cloud, we need to logout the user
            if (((_b = (_a = data.error) === null || _a === void 0 ? void 0 : _a.response) === null || _b === void 0 ? void 0 : _b.status) === 401) {
                await this.params.logout();
            }
            if (data.error && data.operation.kind === 'mutation') {
                await this.invalidate({ __typename: 'Query' });
            }
            return {
                ...data,
                errors: (_c = data.error) === null || _c === void 0 ? void 0 : _c.graphQLErrors,
            };
        });
        tslib_1.__classPrivateFieldSet(this, _CloudDataSource_cloudUrqlClient, this.reset(), "f");
        tslib_1.__classPrivateFieldSet(this, _CloudDataSource_batchExecutor, (0, batch_execute_1.createBatchingExecutor)((config) => {
            return tslib_1.__classPrivateFieldGet(this, _CloudDataSource_instances, "m", _CloudDataSource_executeQuery).call(this, namedExecutionDocument(config.document), config.variables);
        }, { maxBatchSize: 20 }), "f");
        tslib_1.__classPrivateFieldSet(this, _CloudDataSource_batchExecutorBatcher, tslib_1.__classPrivateFieldGet(this, _CloudDataSource_instances, "m", _CloudDataSource_makeBatchExecutionBatcher).call(this), "f");
    }
    reset() {
        return tslib_1.__classPrivateFieldSet(this, _CloudDataSource_cloudUrqlClient, (0, core_1.createClient)({
            url: `${this.getCloudUrl(cloudEnv)}/test-runner-graphql`,
            exchanges: [
                core_1.dedupExchange,
                (0, exchange_graphcache_1.cacheExchange)({
                    // @ts-ignore
                    schema: null/*urql_introspection_gen_1.urqlSchema*/,
                    ...urqlCacheKeys_1.urqlCacheKeys,
                    updates: {
                        Mutation: {
                            _cloudCacheInvalidate: (parent, { args }, cache, info) => {
                                cache.invalidate(...args);
                            },
                            _showUrqlCache: (parent, { args }, cache, info) => {
                                tslib_1.__classPrivateFieldSet(this, _CloudDataSource_lastCache, JSON.stringify(cache, function replacer(key, value) {
                                    if (value instanceof Map) {
                                        const reducer = (obj, mapKey) => {
                                            obj[mapKey] = value.get(mapKey);
                                            return obj;
                                        };
                                        return [...value.keys()].sort().reduce(reducer, {});
                                    }
                                    if (value instanceof Set) {
                                        return [...value].sort();
                                    }
                                    return value;
                                }), "f");
                            },
                        },
                    },
                }),
                core_1.fetchExchange,
            ],
            // Set this way so we can intercept the fetch on the context for testing
            fetch: async (uri, init) => {
                const internalResponse = lodash_1.default.get(init, 'headers.INTERNAL_REQUEST');
                if (internalResponse) {
                    return Promise.resolve(new cross_fetch_1.Response(internalResponse, { status: 200 }));
                }
                return this.params.fetch(uri, {
                    ...init,
                    headers: {
                        ...init === null || init === void 0 ? void 0 : init.headers,
                        ...await tslib_1.__classPrivateFieldGet(this, _CloudDataSource_instances, "m", _CloudDataSource_additionalHeaders).call(this),
                    },
                });
            },
        }), "f");
    }
    delegateCloudField(params) {
        return (0, delegate_1.delegateToSchema)({
            operation: 'query',
            schema: params.ctx.config.schemaCloud,
            fieldName: params.field,
            fieldNodes: params.info.fieldNodes,
            info: params.info,
            args: params.args,
            context: params.ctx,
            operationName: this.makeOperationName(params.info),
        });
    }
    makeOperationName(info) {
        var _a, _b;
        return `${(_b = (_a = info.operation.name) === null || _a === void 0 ? void 0 : _a.value) !== null && _b !== void 0 ? _b : 'Anonymous'}_${(0, Path_1.pathToArray)(info.path).map((p) => typeof p === 'number' ? 'idx' : p).join('_')}`;
    }
    isResolving(config) {
        const stableKey = tslib_1.__classPrivateFieldGet(this, _CloudDataSource_instances, "m", _CloudDataSource_hashRemoteRequest).call(this, config);
        return Boolean(tslib_1.__classPrivateFieldGet(this, _CloudDataSource_pendingPromises, "f").get(stableKey));
    }
    hasResolved(config) {
        const eagerResult = tslib_1.__classPrivateFieldGet(this, _CloudDataSource_cloudUrqlClient, "f").readQuery(config.operationDoc, config.operationVariables);
        return Boolean(eagerResult);
    }
    readFromCache(config) {
        return tslib_1.__classPrivateFieldGet(this, _CloudDataSource_cloudUrqlClient, "f").readQuery(config.operationDoc, config.operationVariables);
    }
    /**
     * Executes the query against a remote schema. Keeps an urql client for the normalized caching,
     * so we can respond quickly on first-load if we have data. Since this is ultimately being used
     * as a remote request mechanism for a stitched schema, we reject the promise if we see any errors.
     */
    executeRemoteGraphQL(config) {
        // We do not want unauthenticated requests to hit the remote schema
        if (!tslib_1.__classPrivateFieldGet(this, _CloudDataSource_instances, "a", _CloudDataSource_user_get)) {
            return { data: null };
        }
        if (config.operationType === 'mutation') {
            return tslib_1.__classPrivateFieldGet(this, _CloudDataSource_cloudUrqlClient, "f").mutation(config.operationDoc, config.operationVariables).toPromise().then(tslib_1.__classPrivateFieldGet(this, _CloudDataSource_formatWithErrors, "f"));
        }
        // First, we check the cache to see if we have the data to fulfill this query
        const eagerResult = this.readFromCache(config);
        // If we do have a synchronous result, return it, and determine if we want to check for
        // updates to this field
        if (eagerResult && config.requestPolicy !== 'network-only') {
            debug(`eagerResult found stale? %s, %s, %o`, eagerResult.stale, config.requestPolicy, eagerResult.data);
            // If we have some of the fields, but not the full thing, return what we do have and follow up
            // with an update we send to the client.
            if ((eagerResult === null || eagerResult === void 0 ? void 0 : eagerResult.stale) || config.requestPolicy === 'cache-and-network') {
                return { ...eagerResult, executing: tslib_1.__classPrivateFieldGet(this, _CloudDataSource_instances, "m", _CloudDataSource_maybeQueueDeferredExecute).call(this, config, eagerResult) };
            }
            return eagerResult;
        }
        // If we don't have a result here, queue this for execution if we haven't already,
        // and resolve with null
        return tslib_1.__classPrivateFieldGet(this, _CloudDataSource_instances, "m", _CloudDataSource_maybeQueueDeferredExecute).call(this, config);
    }
    // Invalidate individual fields in the GraphQL by hitting a "fake"
    // mutation and calling cache.invalidate on the internal cache
    // https://formidable.com/open-source/urql/docs/api/graphcache/#invalidate
    invalidate(...args) {
        return tslib_1.__classPrivateFieldGet(this, _CloudDataSource_cloudUrqlClient, "f").mutation(`
      mutation Internal_cloudCacheInvalidate($args: JSON) { 
        _cloudCacheInvalidate(args: $args) 
      }
    `, { args }, {
            fetchOptions: {
                headers: {
                    // Not urgent, but a nice-to-have, replace this with an exchange to
                    // be more explicit about filtering out this request, rather than looking at headers
                    // in the in the "fetch" exchange
                    INTERNAL_REQUEST: JSON.stringify({ data: { _cloudCacheInvalidate: true } }),
                },
            },
        }).toPromise();
    }
    async getCache() {
        var _a;
        await tslib_1.__classPrivateFieldGet(this, _CloudDataSource_cloudUrqlClient, "f").mutation(`
      mutation Internal_showUrqlCache { 
        _showUrqlCache
      }
    `, {}, {
            fetchOptions: {
                headers: {
                    // Same note as above on the "invalidate", we could make this a bit clearer
                    INTERNAL_REQUEST: JSON.stringify({ data: { _cloudCacheInvalidate: true } }),
                },
            },
        }).toPromise();
        return JSON.parse((_a = tslib_1.__classPrivateFieldGet(this, _CloudDataSource_lastCache, "f")) !== null && _a !== void 0 ? _a : '');
    }
    getCloudUrl(env) {
        return REMOTE_SCHEMA_URLS[env];
    }
}
exports.CloudDataSource = CloudDataSource;
_CloudDataSource_cloudUrqlClient = new WeakMap(), _CloudDataSource_lastCache = new WeakMap(), _CloudDataSource_batchExecutor = new WeakMap(), _CloudDataSource_batchExecutorBatcher = new WeakMap(), _CloudDataSource_pendingPromises = new WeakMap(), _CloudDataSource_formatWithErrors = new WeakMap(), _CloudDataSource_instances = new WeakSet(), _CloudDataSource_user_get = function _CloudDataSource_user_get() {
    return this.params.getUser();
}, _CloudDataSource_additionalHeaders = async function _CloudDataSource_additionalHeaders() {
    var _a;
    return {
        'Authorization': tslib_1.__classPrivateFieldGet(this, _CloudDataSource_instances, "a", _CloudDataSource_user_get) ? `bearer ${tslib_1.__classPrivateFieldGet(this, _CloudDataSource_instances, "a", _CloudDataSource_user_get).authToken}` : '',
        'x-cypress-version': root_1.default.version,
        'x-machine-id': await ((_a = this.params.headers) === null || _a === void 0 ? void 0 : _a.getMachineId) || '',
    };
}, _CloudDataSource_hashRemoteRequest = function _CloudDataSource_hashRemoteRequest(config) {
    var _a;
    const operation = (0, graphql_1.print)(config.operationDoc);
    return `${(_a = config.operationHash) !== null && _a !== void 0 ? _a : tslib_1.__classPrivateFieldGet(this, _CloudDataSource_instances, "m", _CloudDataSource_sha1).call(this, operation)}-${(0, core_1.stringifyVariables)(config.operationVariables)}`;
}, _CloudDataSource_sha1 = function _CloudDataSource_sha1(str) {
    return crypto_1.default.createHash('sha1').update(str).digest('hex');
}, _CloudDataSource_maybeQueueDeferredExecute = function _CloudDataSource_maybeQueueDeferredExecute(config, initialResult) {
    const stableKey = tslib_1.__classPrivateFieldGet(this, _CloudDataSource_instances, "m", _CloudDataSource_hashRemoteRequest).call(this, config);
    let loading = tslib_1.__classPrivateFieldGet(this, _CloudDataSource_pendingPromises, "f").get(stableKey);
    if (loading) {
        return loading;
    }
    const query = config.shouldBatch
        ? tslib_1.__classPrivateFieldGet(this, _CloudDataSource_batchExecutorBatcher, "f").load(config)
        : tslib_1.__classPrivateFieldGet(this, _CloudDataSource_instances, "m", _CloudDataSource_executeQuery).call(this, config.operationDoc, config.operationVariables);
    loading = query.then(tslib_1.__classPrivateFieldGet(this, _CloudDataSource_formatWithErrors, "f"))
        .then(async (op) => {
        tslib_1.__classPrivateFieldGet(this, _CloudDataSource_pendingPromises, "f").delete(stableKey);
        // If we have an initial result, by this point we expect that the query should be fully resolved in the cache.
        // If it's not, it means that we need to clear the cache on the client/server, otherwise it's going to fall into
        // an infinite loop trying to resolve the stale data. This likely only happens in contrived test cases, but
        // it's good to handle regardless.
        if (initialResult) {
            const eagerResult = this.readFromCache(config);
            if (eagerResult === null || eagerResult === void 0 ? void 0 : eagerResult.stale) {
                debug('Has initial result with stale eagerResult', op.data, eagerResult.data);
                await this.invalidate({ __typename: 'Query' });
                this.params.invalidateClientUrqlCache();
                return op;
            }
        }
        if (initialResult && !lodash_1.default.isEqual(op.data, initialResult.data)) {
            debug('Different Query Value %j, %j', op.data, initialResult.data);
            if (typeof config.onUpdatedResult === 'function') {
                config.onUpdatedResult(op.data);
            }
            return op;
        }
        return op;
    });
    tslib_1.__classPrivateFieldGet(this, _CloudDataSource_pendingPromises, "f").set(stableKey, loading);
    return loading;
}, _CloudDataSource_executeQuery = function _CloudDataSource_executeQuery(operationDoc, operationVariables = {}) {
    debug(`Executing remote dashboard request %s, %j`, (0, graphql_1.print)(operationDoc), operationVariables);
    return tslib_1.__classPrivateFieldGet(this, _CloudDataSource_cloudUrqlClient, "f").query(operationDoc, operationVariables, { requestPolicy: 'network-only' }).toPromise();
}, _CloudDataSource_makeBatchExecutionBatcher = function _CloudDataSource_makeBatchExecutionBatcher() {
    return new dataloader_1.default(async (toBatch) => {
        return Promise.allSettled(toBatch.map((b) => {
            return tslib_1.__classPrivateFieldGet(this, _CloudDataSource_batchExecutor, "f").call(this, {
                operationType: 'query',
                document: b.operationDoc,
                variables: b.operationVariables,
            });
        })).then((val) => val.map((v) => v.status === 'fulfilled' ? v.value : tslib_1.__classPrivateFieldGet(this, _CloudDataSource_instances, "m", _CloudDataSource_ensureError).call(this, v.reason)));
    }, {
        cache: false,
    });
}, _CloudDataSource_ensureError = function _CloudDataSource_ensureError(val) {
    return val instanceof Error ? val : new Error(val);
};
/**
 * Adds "batchExecutionQuery" to the query that we generate from the batch loader,
 * useful to key off of in the tests.
 */
function namedExecutionDocument(document) {
    let hasReplaced = false;
    return (0, graphql_1.visit)(document, {
        enter() {
            if (hasReplaced) {
                return false;
            }
            return;
        },
        OperationDefinition(op) {
            if (op.name) {
                return op;
            }
            hasReplaced = true;
            const selectionSet = new Set();
            op.selectionSet.selections.forEach((s) => {
                if (s.kind === 'Field') {
                    selectionSet.add(s.name.value);
                }
            });
            let operationName = 'batchTestRunnerExecutionQuery';
            if (selectionSet.size > 0) {
                operationName = `${operationName}_${Array.from(selectionSet).sort().join('_')}`;
            }
            const namedOperationNode = {
                ...op,
                name: {
                    kind: 'Name',
                    value: operationName,
                },
            };
            return namedOperationNode;
        },
    });
}
