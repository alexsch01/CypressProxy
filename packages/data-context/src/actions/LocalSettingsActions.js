"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocalSettingsActions = void 0;
const tslib_1 = require("tslib");
const types_1 = require(process.argv[1]+"/../packages/types");
const p_defer_1 = tslib_1.__importDefault(require("p-defer"));
const lodash_1 = tslib_1.__importDefault(require("lodash"));
const debug_1 = tslib_1.__importDefault(require("debug"));
const debug = (0, debug_1.default)('cypress:data-context:actions:LocalSettingsActions');
// If the value being merged is an array, replace it rather than merging the array items together
function customizer(objValue, srcValue) {
    if (lodash_1.default.isArray(objValue)) {
        return srcValue;
    }
}
class LocalSettingsActions {
    constructor(ctx) {
        this.ctx = ctx;
    }
    async setPreferences(stringifiedJson, type) {
        const toJson = JSON.parse(stringifiedJson);
        if (type === 'global') {
            // update local data on server
            lodash_1.default.mergeWith(this.ctx.coreData.localSettings.preferences, toJson, customizer);
            // persist to global appData - projects/__global__/state.json
            const currentGlobalPreferences = await this.ctx._apis.localSettingsApi.getPreferences();
            const combinedResult = lodash_1.default.mergeWith(currentGlobalPreferences, toJson, customizer);
            return this.ctx._apis.localSettingsApi.setPreferences(combinedResult);
        }
        const currentLocalPreferences = this.ctx._apis.projectApi.getCurrentProjectSavedState();
        const combinedResult = lodash_1.default.mergeWith(currentLocalPreferences, toJson, customizer);
        // persist to project appData - for example projects/launchpad/state.json
        return this.ctx._apis.projectApi.setProjectPreferences(combinedResult);
    }
    async refreshLocalSettings() {
        var _a;
        if ((_a = this.ctx.coreData.localSettings) === null || _a === void 0 ? void 0 : _a.refreshing) {
            return;
        }
        debug('refresh local settings');
        const dfd = (0, p_defer_1.default)();
        this.ctx.coreData.localSettings.refreshing = dfd.promise;
        // TODO(tim): global unhandled error concept
        const availableEditors = await this.ctx._apis.localSettingsApi.getAvailableEditors();
        this.ctx.coreData.localSettings.availableEditors = availableEditors;
        this.ctx.coreData.localSettings.preferences = {
            ...types_1.defaultPreferences,
            ...(await this.ctx._apis.localSettingsApi.getPreferences()),
        };
        const preferences = this.ctx.coreData.localSettings.preferences;
        // Fix bad value for notifyWhenRunCompletes.  See https://github.com/cypress-io/cypress/issues/27228
        if (typeof preferences.notifyWhenRunCompletes === 'boolean') {
            if (preferences.notifyWhenRunCompletes === true) {
                preferences.notifyWhenRunCompletes = [...types_1.NotifyCompletionStatuses];
            }
            else {
                preferences.notifyWhenRunCompletes = [];
            }
            await this.ctx._apis.localSettingsApi.setPreferences(preferences);
        }
        dfd.resolve();
    }
}
exports.LocalSettingsActions = LocalSettingsActions;
