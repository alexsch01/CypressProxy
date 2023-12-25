"use strict";
var _EventCollectorSource_localTestCountsListener;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventCollectorSource = void 0;
const tslib_1 = require("tslib");
const debug_1 = tslib_1.__importDefault(require("debug"));
const dayjs_1 = tslib_1.__importDefault(require("dayjs"));
const testCounts_1 = require("../util/testCounts");
const lodash_1 = require("lodash");
const debug = (0, debug_1.default)('cypress:data-context:sources:EventCollectorSource');
class EventCollectorSource {
    constructor(ctx) {
        this.ctx = ctx;
        _EventCollectorSource_localTestCountsListener.set(this, (0, lodash_1.debounce)(() => {
            this.sendLocalTestCounts()
                .catch((error) => {
                debug('error caught from sending counts', error);
            });
        }, 250));
        debug('Starting');
        ctx.emitter.subscribeToRawEvent('authChange', tslib_1.__classPrivateFieldGet(this, _EventCollectorSource_localTestCountsListener, "f"));
        ctx.emitter.subscribeToRawEvent('configChange', tslib_1.__classPrivateFieldGet(this, _EventCollectorSource_localTestCountsListener, "f"));
    }
    destroy() {
        this.ctx.emitter.unsubscribeToRawEvent('authChange', tslib_1.__classPrivateFieldGet(this, _EventCollectorSource_localTestCountsListener, "f"));
        this.ctx.emitter.unsubscribeToRawEvent('configChange', tslib_1.__classPrivateFieldGet(this, _EventCollectorSource_localTestCountsListener, "f"));
    }
    async sendLocalTestCounts() {
        var _a, _b;
        debug('Checking to send local test counts');
        if (!this.ctx.coreData.currentTestingType) {
            debug('will not send - no testing type');
            return;
        }
        const user = this.ctx.coreData.user;
        const isAuthenticated = !!user && !!user.name;
        if (!isAuthenticated) {
            debug('will not send - not authenticated');
            return;
        }
        const currentLocalPreferences = this.ctx.project.getCurrentProjectSavedState();
        const lastTestCountsEvent = currentLocalPreferences === null || currentLocalPreferences === void 0 ? void 0 : currentLocalPreferences.lastTestCountsEvent;
        const thirtyDaysAgo = (0, dayjs_1.default)().subtract(30, 'days');
        const hasBeenSentLast30Days = !!lastTestCountsEvent && thirtyDaysAgo.isBefore((0, dayjs_1.default)(lastTestCountsEvent));
        if (hasBeenSentLast30Days) {
            debug('will not send', { isAuthenticated, hasBeenSentLast30Days });
            return;
        }
        const testingType = this.ctx.coreData.currentTestingType === 'e2e' ? 'E2E' : 'COMPONENT';
        const testCounts = await (0, testCounts_1.getTestCounts)(this.ctx.project.specs);
        const projectSlug = await this.ctx.project.projectId();
        const localTestCounts = {
            projectSlug,
            testingType,
            ...testCounts,
            branch: (_a = this.ctx.git) === null || _a === void 0 ? void 0 : _a.currentBranch,
        };
        debug('sending recordEvent for local test counts', localTestCounts);
        const result = await this.ctx.actions.eventCollector.recordEventGQL({ localTestCounts });
        if (((_b = result.data) === null || _b === void 0 ? void 0 : _b.cloudRecordEvent) === true) {
            await this.ctx.actions.localSettings.setPreferences(JSON.stringify({ lastTestCountsEvent: Date.now() }), 'project');
        }
        debug('result', result);
    }
}
exports.EventCollectorSource = EventCollectorSource;
_EventCollectorSource_localTestCountsListener = new WeakMap();
