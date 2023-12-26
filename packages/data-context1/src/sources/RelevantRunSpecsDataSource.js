"use strict";
var _RelevantRunSpecsDataSource_pollingInterval, _RelevantRunSpecsDataSource_cached, _RelevantRunSpecsDataSource_query, _RelevantRunSpecsDataSource_poller;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RelevantRunSpecsDataSource = void 0;
const tslib_1 = require("tslib");
const core_1 = require("@urql/core");
const graphql_1 = require("graphql");
const debug_1 = tslib_1.__importDefault(require("debug"));
const polling_1 = require("../polling");
const lodash_1 = require("lodash");
const debug = (0, debug_1.default)('cypress:data-context:sources:RelevantRunSpecsDataSource');
/**
 * DataSource used to watch RUNNING CloudRuns for changes to provide
 * near real time updates to the app front end
 *
 * This DataSource backs the `relevantRunSpecChange` subscription by creating
 * a poller that will poll for changes for the set of runs. If the data
 * returned changes, it will emit a message on the subscription.
 */
class RelevantRunSpecsDataSource {
    constructor(ctx) {
        this.ctx = ctx;
        _RelevantRunSpecsDataSource_pollingInterval.set(this, 15);
        _RelevantRunSpecsDataSource_cached.set(this, new Map());
        _RelevantRunSpecsDataSource_query.set(this, void 0);
        _RelevantRunSpecsDataSource_poller.set(this, void 0);
    }
    specs(id) {
        return tslib_1.__classPrivateFieldGet(this, _RelevantRunSpecsDataSource_cached, "f").get(id);
    }
    get pollingInterval() {
        return tslib_1.__classPrivateFieldGet(this, _RelevantRunSpecsDataSource_pollingInterval, "f");
    }
    /**
    * Query for the set of CloudRuns by id
    * @param runIds for RUNNING CloudRuns that are being watched from the front end for changes
    */
    async getRelevantRunSpecs(runIds) {
        var _a, _b, _c;
        if (runIds.length === 0) {
            return [];
        }
        debug(`Fetching runs %o`, runIds);
        const result = await this.ctx.cloud.executeRemoteGraphQL({
            fieldName: 'cloudNodesByIds',
            operationDoc: tslib_1.__classPrivateFieldGet(this, _RelevantRunSpecsDataSource_query, "f"),
            operationVariables: {
                ids: runIds,
            },
            requestPolicy: 'network-only', // we never want to hit local cache for this request
        });
        if (result.error) {
            debug(`Error when fetching relevant runs for all runs: %o: error -> %o`, runIds, result.error);
            return [];
        }
        const nodes = (_a = result.data) === null || _a === void 0 ? void 0 : _a.cloudNodesByIds;
        const pollingInterval = (_c = (_b = result.data) === null || _b === void 0 ? void 0 : _b.pollingIntervals) === null || _c === void 0 ? void 0 : _c.runByNumber;
        debug(`Result returned - length: ${nodes === null || nodes === void 0 ? void 0 : nodes.length} pollingInterval: ${pollingInterval}`);
        if (pollingInterval) {
            tslib_1.__classPrivateFieldSet(this, _RelevantRunSpecsDataSource_pollingInterval, pollingInterval, "f");
            if (tslib_1.__classPrivateFieldGet(this, _RelevantRunSpecsDataSource_poller, "f")) {
                tslib_1.__classPrivateFieldGet(this, _RelevantRunSpecsDataSource_poller, "f").interval = tslib_1.__classPrivateFieldGet(this, _RelevantRunSpecsDataSource_pollingInterval, "f");
            }
        }
        return nodes || [];
    }
    pollForSpecs(runId, info) {
        debug(`pollForSpecs called`);
        //TODO Get spec counts before poll starts
        if (!tslib_1.__classPrivateFieldGet(this, _RelevantRunSpecsDataSource_poller, "f")) {
            tslib_1.__classPrivateFieldSet(this, _RelevantRunSpecsDataSource_poller, new polling_1.Poller(this.ctx, 'relevantRunSpecChange', tslib_1.__classPrivateFieldGet(this, _RelevantRunSpecsDataSource_pollingInterval, "f"), async (subscriptions) => {
                debug('subscriptions', subscriptions.length);
                const runIds = (0, lodash_1.uniq)((0, lodash_1.compact)(subscriptions === null || subscriptions === void 0 ? void 0 : subscriptions.map((sub) => { var _a; return (_a = sub.meta) === null || _a === void 0 ? void 0 : _a.runId; })));
                debug('Polling for specs for runs: %o', runIds);
                const query = this.createQuery((0, lodash_1.compact)(subscriptions.map((sub) => { var _a; return (_a = sub.meta) === null || _a === void 0 ? void 0 : _a.info; })));
                //debug('query', query)
                tslib_1.__classPrivateFieldSet(this, _RelevantRunSpecsDataSource_query, query, "f");
                const runs = await this.getRelevantRunSpecs(runIds);
                debug(`Run data is `, runs);
                runs.forEach(async (run) => {
                    if (!run) {
                        return;
                    }
                    const cachedRun = tslib_1.__classPrivateFieldGet(this, _RelevantRunSpecsDataSource_cached, "f").get(run.id);
                    if (!cachedRun || !(0, lodash_1.isEqual)(run, cachedRun)) {
                        debug(`Caching for id %s: %o`, run.id, run);
                        tslib_1.__classPrivateFieldGet(this, _RelevantRunSpecsDataSource_cached, "f").set(run.id, { ...run });
                        const cachedRelevantRuns = this.ctx.relevantRuns.cache;
                        if (run.runNumber === cachedRelevantRuns.selectedRunNumber) {
                            const projectSlug = await this.ctx.project.projectId();
                            debug(`Invalidate cloudProjectBySlug ${projectSlug}`);
                            await this.ctx.cloud.invalidate('Query', 'cloudProjectBySlug', { slug: projectSlug });
                            await this.ctx.emitter.relevantRunChange(cachedRelevantRuns);
                        }
                        this.ctx.emitter.relevantRunSpecChange(run);
                    }
                });
                debug('processed runs');
            }), "f");
        }
        const fields = getFields(info);
        /**
         * Checks runs as they are emitted for the subscription to make sure they match what is
         * expected by the subscription they are attached to. First, verifies it is for the run
         * being watched by comparing IDs. Then also verifies that the fields match.  The field validation
         * was needed to prevent a race condition when attaching different subscriptions for the same
         * run that expect different fields.
         *
         * @param run check to see if it should be filtered out
         */
        const filter = (run) => {
            const runIdsMatch = run.id === runId;
            const runFields = Object.keys(run);
            const hasAllFields = fields.every((field) => runFields.includes(field));
            debug('Calling filter %o', { runId, runIdsMatch, hasAllFields }, runFields, fields);
            return runIdsMatch && hasAllFields;
        };
        return tslib_1.__classPrivateFieldGet(this, _RelevantRunSpecsDataSource_poller, "f").start({ meta: { runId, info }, filter });
    }
    createQuery(infos) {
        const fragmentSpreadName = 'Subscriptions';
        const allFragments = createFragments(infos, fragmentSpreadName);
        const document = `
      query RelevantRunSpecsDataSource_Specs(
        $ids: [ID!]!
      ) {
        cloudNodesByIds(ids: $ids) {
          id
          ... on CloudRun {
            ...${fragmentSpreadName}
          }
        }
        pollingIntervals {
          runByNumber
        }
      }

      ${allFragments.map((fragment) => `${(0, graphql_1.print)(fragment)}\n`).join('\n')}
    `;
        return (0, core_1.gql)(document);
    }
}
exports.RelevantRunSpecsDataSource = RelevantRunSpecsDataSource;
_RelevantRunSpecsDataSource_pollingInterval = new WeakMap(), _RelevantRunSpecsDataSource_cached = new WeakMap(), _RelevantRunSpecsDataSource_query = new WeakMap(), _RelevantRunSpecsDataSource_poller = new WeakMap();
/**
 * Creates an array of GraphQL fragments that represent each of the queries being requested for the set of subscriptions
 * that are using the poller created by this class
 *
 * @example
 * The set of fragments will look like the following with `combinedFragmentName` set to "Subscriptions"
 * and an array of 2 "infos" and the expected type of CloudRun:
 *
 * fragment Subscriptions on CloudRun  {
 *   ...Fragment0
 *   ...Fragment1
 * }
 *
 * fragment Fragment0 on CloudRun {
 *   { selections from the first GraphQLResolveInfo}
 * }
 *
 * fragment Fragment1 on CloudRun {
 *   { selections from the second GraphQLResolveInfo}
 * }
 *
 *
 * @param infos array of `GraphQLResolveInfo` objects for each subscription using this datasource
 * @param combinedFragmentName name for creating the fragment that combines together all the child fragments
 */
const createFragments = (infos, combinedFragmentName) => {
    const fragments = infos.map((info, index) => createFragment(info, index));
    const fragmentNames = fragments.map((fragment) => fragment.name.value);
    const combinedFragment = createCombinedFragment(combinedFragmentName, fragmentNames, infos[0].returnType);
    return [combinedFragment, ...fragments];
};
/**
 * Generate a GraphQL fragment that uses the selections from the info parameter
 *
 * NOTE: any aliases for field names are removed since these will be
 * applied on the front end
 *
 * @example
 * fragment Fragment0 on CloudRun {
 *   { selections from the GraphQLResolveInfo}
 * }
 *
 * @param info to use for selections for the generated fragment
 * @param index value to use as suffix for the fragment name
 */
const createFragment = (info, index) => {
    var _a;
    const fragmentType = info.returnType.toString();
    //remove aliases
    const newFieldNode = (0, graphql_1.visit)(info.fieldNodes[0], {
        enter(node) {
            const newNode = {
                ...node,
                alias: undefined,
            };
            return newNode;
        },
    });
    const selections = (_a = newFieldNode.selectionSet) === null || _a === void 0 ? void 0 : _a.selections;
    return {
        kind: 'FragmentDefinition',
        name: { kind: 'Name', value: `Fragment${index}` },
        typeCondition: {
            kind: 'NamedType',
            name: { kind: 'Name', value: fragmentType },
        },
        selectionSet: {
            kind: 'SelectionSet',
            selections,
        },
    };
};
/**
 * Generates a fragment that contains other fragment spreads
 *
 * @example
 * fragment CombinedFragment on Type {
 *  ...Fragment0
 *  ...Fragment1
 * }
 *
 * @param name name to be used for the fragment
 * @param fragmentNames array of names to generate fragment spreads
 * @param type of the fragment
 */
const createCombinedFragment = (name, fragmentNames, type) => {
    return {
        kind: 'FragmentDefinition',
        name: { kind: 'Name', value: name },
        typeCondition: {
            kind: 'NamedType',
            name: { kind: 'Name', value: type.toString() },
        },
        selectionSet: {
            kind: 'SelectionSet',
            selections: fragmentNames.map((fragmentName) => {
                return {
                    kind: 'FragmentSpread',
                    name: { kind: 'Name', value: fragmentName },
                };
            }),
        },
    };
};
/**
 * Get the field names for a given GraphQLResolveInfo
 * @param info to extract field names from
 */
const getFields = (info) => {
    var _a;
    const selections = (_a = info.fieldNodes[0].selectionSet) === null || _a === void 0 ? void 0 : _a.selections;
    const fields = selections.map((selection) => selection.kind === 'Field' && selection.name.value).filter((field) => typeof field === 'string');
    return fields;
};
