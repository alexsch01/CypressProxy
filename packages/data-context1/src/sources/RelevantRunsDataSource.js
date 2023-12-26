"use strict";
var _RelevantRunsDataSource_instances, _RelevantRunsDataSource_pollingInterval, _RelevantRunsDataSource_cached, _RelevantRunsDataSource_runsPoller, _RelevantRunsDataSource_calculateSelectedRun, _RelevantRunsDataSource_takeRelevantRuns, _RelevantRunsDataSource_takeLatestRuns, _RelevantRunsDataSource_emitRelevantRunsIfChanged;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RelevantRunsDataSource = exports.RUNS_EMPTY_RETURN = void 0;
const tslib_1 = require("tslib");
const core_1 = require("@urql/core");
const debug_1 = tslib_1.__importDefault(require("debug"));
const lodash_1 = require("lodash");
const polling_1 = require("../polling");
const debug = (0, debug_1.default)('cypress:data-context:sources:RelevantRunsDataSource');
const RELEVANT_RUN_OPERATION_DOC = (0, core_1.gql) `
  query RelevantRunsDataSource_RunsByCommitShas(
    $projectSlug: String!
    $shas: [String!]!
  ) {
    cloudProjectBySlug(slug: $projectSlug) {
      __typename
      ... on CloudProject {
        id
        runsByCommitShas(commitShas: $shas, runLimit: 100) {
          id
          runNumber
          status
          totalFailed
          commitInfo {
            sha
          }
        }
      }
    }
    pollingIntervals {
      runsByCommitShas
    }
  }
`;
exports.RUNS_EMPTY_RETURN = { commitsAhead: -1, all: [], latest: [] };
/**
 * DataSource to encapsulate querying Cypress Cloud for runs that match a list of local Git commit shas
 */
class RelevantRunsDataSource {
    constructor(ctx) {
        _RelevantRunsDataSource_instances.add(this);
        this.ctx = ctx;
        _RelevantRunsDataSource_pollingInterval.set(this, 30);
        _RelevantRunsDataSource_cached.set(this, exports.RUNS_EMPTY_RETURN);
        _RelevantRunsDataSource_runsPoller.set(this, void 0);
    }
    get cache() {
        return tslib_1.__classPrivateFieldGet(this, _RelevantRunsDataSource_cached, "f");
    }
    /**
     * Pulls runs from the current Cypress Cloud account and determines which runs are considered:
     * - "current" the most recent completed run, or if not found, the most recent running run
     * - "next" the most recent running run if a completed run is found
     * @param shas list of Git commit shas to query the Cloud with for matching runs
     * @param preserveCurrentRun [default false] if true, will attempt to keep the current cached run
     */
    async getRelevantRuns(shas) {
        var _a, _b, _c, _d;
        if (shas.length === 0) {
            debug('Called with no shas');
            return [];
        }
        const projectSlug = await this.ctx.project.projectId();
        if (!projectSlug) {
            debug('No project detected');
            return [];
        }
        debug(`Fetching runs for ${projectSlug} and ${shas.length} shas`);
        //Not ideal typing for this return since the query is not fetching all the fields, but better than nothing
        const result = await this.ctx.cloud.executeRemoteGraphQL({
            fieldName: 'cloudProjectBySlug',
            operationDoc: RELEVANT_RUN_OPERATION_DOC,
            operationVariables: {
                projectSlug,
                shas,
            },
            requestPolicy: 'network-only', // we never want to hit local cache for this request
        });
        if (result.error) {
            debug(`Error fetching relevant runs for project ${projectSlug}`, result.error);
            return [];
        }
        const cloudProject = (_a = result.data) === null || _a === void 0 ? void 0 : _a.cloudProjectBySlug;
        const pollingInterval = (_c = (_b = result.data) === null || _b === void 0 ? void 0 : _b.pollingIntervals) === null || _c === void 0 ? void 0 : _c.runsByCommitShas;
        debug(`Result returned - type: ${cloudProject === null || cloudProject === void 0 ? void 0 : cloudProject.__typename} pollingInterval: ${pollingInterval}`);
        if (pollingInterval) {
            tslib_1.__classPrivateFieldSet(this, _RelevantRunsDataSource_pollingInterval, pollingInterval, "f");
            if (tslib_1.__classPrivateFieldGet(this, _RelevantRunsDataSource_runsPoller, "f")) {
                tslib_1.__classPrivateFieldGet(this, _RelevantRunsDataSource_runsPoller, "f").interval = tslib_1.__classPrivateFieldGet(this, _RelevantRunsDataSource_pollingInterval, "f");
            }
        }
        if ((cloudProject === null || cloudProject === void 0 ? void 0 : cloudProject.__typename) !== 'CloudProject') {
            debug('Returning empty');
            return [];
        }
        const runs = ((_d = cloudProject.runsByCommitShas) === null || _d === void 0 ? void 0 : _d.filter((run) => {
            var _a;
            return run != null && !!run.runNumber && !!run.status && !!((_a = run.commitInfo) === null || _a === void 0 ? void 0 : _a.sha);
        }).map((run) => {
            var _a;
            return {
                runId: run.id,
                runNumber: run.runNumber,
                status: run.status,
                sha: (_a = run.commitInfo) === null || _a === void 0 ? void 0 : _a.sha,
                totalFailed: run.totalFailed || 0,
            };
        })) || [];
        debug(`Found ${runs.length} runs for ${projectSlug} and ${shas.length} shas. Runs %o`, runs);
        return runs;
    }
    /**
     * Clear the cached current run to allow the data source to pick the next completed run as the current
     */
    async moveToRun(runNumber, shas) {
        debug('Moving to next relevant run');
        const run = tslib_1.__classPrivateFieldGet(this, _RelevantRunsDataSource_cached, "f").all.find((run) => run.runNumber === runNumber);
        if (run) {
            //filter relevant runs in case moving causes the previously selected run to no longer be relevant
            const relevantRuns = tslib_1.__classPrivateFieldGet(this, _RelevantRunsDataSource_instances, "m", _RelevantRunsDataSource_takeRelevantRuns).call(this, tslib_1.__classPrivateFieldGet(this, _RelevantRunsDataSource_cached, "f").all);
            const latestRuns = tslib_1.__classPrivateFieldGet(this, _RelevantRunsDataSource_cached, "f").latest;
            await tslib_1.__classPrivateFieldGet(this, _RelevantRunsDataSource_instances, "m", _RelevantRunsDataSource_emitRelevantRunsIfChanged).call(this, { relevantRuns, selectedRun: run, shas, latestRuns });
        }
    }
    /**
     * Wraps the call to `getRelevantRuns` and allows for control of the cached values as well as
     * emitting a `relevantRunChange` event if the new values differ from the cached values.  This is
     * used by the poller created in the `pollForRuns` method as well as when a Git branch change is detected
     * @param shas string[] - list of Git commit shas to use to query Cypress Cloud for runs
     */
    async checkRelevantRuns(shas, preserveSelectedRun = false) {
        const runs = await this.getRelevantRuns(shas);
        const selectedRun = tslib_1.__classPrivateFieldGet(this, _RelevantRunsDataSource_instances, "m", _RelevantRunsDataSource_calculateSelectedRun).call(this, runs, shas, preserveSelectedRun);
        const relevantRuns = tslib_1.__classPrivateFieldGet(this, _RelevantRunsDataSource_instances, "m", _RelevantRunsDataSource_takeRelevantRuns).call(this, runs);
        const latestRuns = tslib_1.__classPrivateFieldGet(this, _RelevantRunsDataSource_instances, "m", _RelevantRunsDataSource_takeLatestRuns).call(this, runs);
        // If there is a selected run that is no longer considered relevant,
        // make sure to still add it to the list of runs
        const selectedRunNumber = selectedRun === null || selectedRun === void 0 ? void 0 : selectedRun.runNumber;
        const relevantRunsHasSelectedRun = relevantRuns.some((run) => run.runNumber === selectedRunNumber);
        const allRunsHasSelectedRun = runs.some((run) => run.runNumber === selectedRunNumber);
        debug('readd selected run check', selectedRunNumber, relevantRunsHasSelectedRun, allRunsHasSelectedRun);
        if (selectedRunNumber && allRunsHasSelectedRun && !relevantRunsHasSelectedRun) {
            const selectedRun = runs.find((run) => run.runNumber === selectedRunNumber);
            if (selectedRun) {
                relevantRuns.push(selectedRun);
            }
        }
        await tslib_1.__classPrivateFieldGet(this, _RelevantRunsDataSource_instances, "m", _RelevantRunsDataSource_emitRelevantRunsIfChanged).call(this, { relevantRuns, selectedRun, shas, latestRuns });
    }
    pollForRuns(location) {
        if (!tslib_1.__classPrivateFieldGet(this, _RelevantRunsDataSource_runsPoller, "f")) {
            tslib_1.__classPrivateFieldSet(this, _RelevantRunsDataSource_runsPoller, new polling_1.Poller(this.ctx, 'relevantRunChange', tslib_1.__classPrivateFieldGet(this, _RelevantRunsDataSource_pollingInterval, "f"), async (subscriptions) => {
                var _a;
                const preserveSelectedRun = subscriptions.some((sub) => { var _a; return ((_a = sub.meta) === null || _a === void 0 ? void 0 : _a.name) === 'DEBUG'; });
                await this.checkRelevantRuns(((_a = this.ctx.git) === null || _a === void 0 ? void 0 : _a.currentHashes) || [], preserveSelectedRun);
            }), "f");
        }
        return tslib_1.__classPrivateFieldGet(this, _RelevantRunsDataSource_runsPoller, "f").start({ initialValue: tslib_1.__classPrivateFieldGet(this, _RelevantRunsDataSource_cached, "f"), meta: { name: location } });
    }
}
exports.RelevantRunsDataSource = RelevantRunsDataSource;
_RelevantRunsDataSource_pollingInterval = new WeakMap(), _RelevantRunsDataSource_cached = new WeakMap(), _RelevantRunsDataSource_runsPoller = new WeakMap(), _RelevantRunsDataSource_instances = new WeakSet(), _RelevantRunsDataSource_calculateSelectedRun = function _RelevantRunsDataSource_calculateSelectedRun(runs, shas, preserveSelectedRun) {
    let selectedRun;
    const firstNonRunningRun = runs.find((run) => run.status !== 'RUNNING');
    const firstRun = runs[0];
    if (tslib_1.__classPrivateFieldGet(this, _RelevantRunsDataSource_cached, "f").selectedRunNumber) {
        selectedRun = runs.find((run) => run.runNumber === tslib_1.__classPrivateFieldGet(this, _RelevantRunsDataSource_cached, "f").selectedRunNumber);
        const selectedRunIsOlderShaThanLatest = selectedRun && firstNonRunningRun && shas.indexOf(selectedRun === null || selectedRun === void 0 ? void 0 : selectedRun.sha) > shas.indexOf(firstNonRunningRun === null || firstNonRunningRun === void 0 ? void 0 : firstNonRunningRun.sha);
        debug('selected run check: run %o', selectedRun, selectedRunIsOlderShaThanLatest, preserveSelectedRun);
        if (selectedRunIsOlderShaThanLatest && !preserveSelectedRun) {
            selectedRun = firstNonRunningRun;
        }
    }
    else if (firstNonRunningRun) {
        selectedRun = firstNonRunningRun;
    }
    else if (firstRun) {
        selectedRun = firstRun;
    }
    return selectedRun;
}, _RelevantRunsDataSource_takeRelevantRuns = function _RelevantRunsDataSource_takeRelevantRuns(runs) {
    let firstShaWithCompletedRun;
    const relevantRuns = (0, lodash_1.takeWhile)(runs, (run) => {
        if (firstShaWithCompletedRun === undefined && run.status !== 'RUNNING') {
            firstShaWithCompletedRun = run.sha;
        }
        return run.status === 'RUNNING' || run.sha === firstShaWithCompletedRun;
    });
    debug('relevant runs after take', relevantRuns);
    return relevantRuns;
}, _RelevantRunsDataSource_takeLatestRuns = function _RelevantRunsDataSource_takeLatestRuns(runs) {
    const latestRuns = (0, lodash_1.take)(runs, 100);
    debug('latest runs after take', latestRuns);
    return latestRuns;
}, _RelevantRunsDataSource_emitRelevantRunsIfChanged = async function _RelevantRunsDataSource_emitRelevantRunsIfChanged({ relevantRuns, selectedRun, shas, latestRuns }) {
    var _a;
    const commitsAhead = (selectedRun === null || selectedRun === void 0 ? void 0 : selectedRun.sha) ? shas.indexOf(selectedRun.sha) : -1;
    const toCache = {
        all: relevantRuns,
        latest: latestRuns,
        commitsAhead,
        selectedRunNumber: selectedRun === null || selectedRun === void 0 ? void 0 : selectedRun.runNumber,
    };
    if ((_a = this.ctx.git) === null || _a === void 0 ? void 0 : _a.currentCommitInfo) {
        toCache.currentCommitInfo = {
            sha: this.ctx.git.currentCommitInfo.hash,
            message: this.ctx.git.currentCommitInfo.message,
        };
        debug('Setting current commit info %o', toCache.currentCommitInfo);
    }
    debug(`New values %o`, toCache);
    //only emit a new value if something changes
    if (!(0, lodash_1.isEqual)(toCache, tslib_1.__classPrivateFieldGet(this, _RelevantRunsDataSource_cached, "f"))) {
        debug('Values changed');
        debug('current cache: %o, new values: %o', tslib_1.__classPrivateFieldGet(this, _RelevantRunsDataSource_cached, "f"), toCache);
        //TODO is the right thing to invalidate?  Can we just invalidate the runsByCommitShas field?
        const projectSlug = await this.ctx.project.projectId();
        await this.ctx.cloud.invalidate('Query', 'cloudProjectBySlug', { slug: projectSlug });
        // If the cache is empty, then we're just starting up. Don't send notifications
        if (tslib_1.__classPrivateFieldGet(this, _RelevantRunsDataSource_cached, "f").all[0] && toCache.all[0] && !(0, lodash_1.isEqual)(toCache.all[0], tslib_1.__classPrivateFieldGet(this, _RelevantRunsDataSource_cached, "f").all[0])) {
            this.ctx.actions.notification.maybeSendRunNotification(tslib_1.__classPrivateFieldGet(this, _RelevantRunsDataSource_cached, "f").all[0], toCache.all[0]);
        }
        tslib_1.__classPrivateFieldSet(this, _RelevantRunsDataSource_cached, {
            ...toCache,
        }, "f");
        this.ctx.emitter.relevantRunChange(tslib_1.__classPrivateFieldGet(this, _RelevantRunsDataSource_cached, "f"));
    }
};
