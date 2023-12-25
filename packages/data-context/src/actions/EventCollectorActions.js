"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventCollectorActions = void 0;
const tslib_1 = require("tslib");
const core_1 = require("@urql/core");
const debug_1 = tslib_1.__importDefault(require("debug"));
const pkg = require(process.argv[1]+'/../packages/root');
const debug = (0, debug_1.default)('cypress:data-context:actions:EventCollectorActions');
/**
 * Defaults to staging when doing development. To override to production for development,
 * explicitly set process.env.CYPRESS_INTERNAL_ENV to 'production`
 */
const cloudEnv = (process.env.CYPRESS_INTERNAL_EVENT_COLLECTOR_ENV || 'production');
class EventCollectorActions {
    constructor(ctx) {
        this.ctx = ctx;
        debug('Using %s environment for Event Collection', cloudEnv);
    }
    async recordEvent(event, includeMachineId) {
        try {
            const cloudUrl = this.ctx.cloud.getCloudUrl(cloudEnv);
            const eventUrl = includeMachineId ? `${cloudUrl}/machine-collect` : `${cloudUrl}/anon-collect`;
            const headers = {
                'Content-Type': 'application/json',
                'x-cypress-version': pkg.version,
            };
            if (includeMachineId) {
                event.machineId = (await this.ctx.coreData.machineId) || undefined;
            }
            await this.ctx.util.fetch(eventUrl, {
                method: 'POST',
                headers,
                body: JSON.stringify(event),
            });
            debug(`Recorded %s event: %o`, includeMachineId ? 'machine-linked' : 'anonymous', event);
            return true;
        }
        catch (err) {
            debug(`Failed to record event %o due to error %o`, event, err);
            return false;
        }
    }
    recordEventGQL(eventInputs) {
        const RECORD_EVENT_GQL = (0, core_1.gql) `
      mutation EventCollectorActions_RecordEvent($localTestCounts: LocalTestCountsInput) {
        cloudRecordEvent(localTestCounts: $localTestCounts)
      }
    `;
        debug('recordEventGQL final variables %o', eventInputs);
        return this.ctx.cloud.executeRemoteGraphQL({
            operationType: 'mutation',
            fieldName: 'cloudRecordEvent',
            operationDoc: RECORD_EVENT_GQL,
            operationVariables: eventInputs,
        });
    }
}
exports.EventCollectorActions = EventCollectorActions;
