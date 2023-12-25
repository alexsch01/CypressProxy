"use strict";
var _NotificationActions_instances, _NotificationActions_showRunNotification;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationActions = void 0;
const tslib_1 = require("tslib");
const debug_1 = tslib_1.__importDefault(require("debug"));
const assert_1 = tslib_1.__importDefault(require("assert"));
const debug = (0, debug_1.default)('cypress:data-context:NotificationActions');
class NotificationActions {
    constructor(ctx) {
        _NotificationActions_instances.add(this);
        this.ctx = ctx;
    }
    async onNotificationClick(run) {
        debug('notification clicked for #%s', run.runNumber);
        await this.ctx.actions.browser.focusActiveBrowserWindow();
        await this.ctx.actions.project.debugCloudRun(run.runNumber);
    }
    get projectTitle() {
        (0, assert_1.default)(this.ctx.coreData.currentProject, 'current project needs to be set to send notifications');
        return this.ctx.project.projectTitle(this.ctx.coreData.currentProject);
    }
    get desktopNotificationsEnabledPreference() {
        return this.ctx.coreData.localSettings.preferences.desktopNotificationsEnabled;
    }
    get notifyWhenRunStartsPreference() {
        return this.ctx.coreData.localSettings.preferences.notifyWhenRunStarts;
    }
    get notifyWhenRunStartsFailingPreference() {
        return this.ctx.coreData.localSettings.preferences.notifyWhenRunStartsFailing;
    }
    get notifyWhenRunCompletesPreference() {
        return this.ctx.coreData.localSettings.preferences.notifyWhenRunCompletes;
    }
    maybeSendRunNotification(cachedRun, newRun) {
        if (this.desktopNotificationsEnabledPreference !== true) {
            debug('desktopNotificationsEnabled not true, skipping notification for run #%s', newRun.runNumber);
            return;
        }
        if (!newRun.status) {
            return;
        }
        if (newRun.status === 'RUNNING') {
            // If the new run has the same run number and last time we saw the run it had 0 failures and now it has more than 0
            // failures, then it just started failing.
            if ((cachedRun.runNumber === newRun.runNumber) && (cachedRun.totalFailed === 0 && newRun.totalFailed > 0)) {
                this.sendRunFailingNotification(newRun);
            }
            else {
                this.sendRunStartedNotification(newRun);
            }
        }
        // If it has a status that isn't RUNNING, it must be done, whether it completed with failure, via cancelation, or other.
        this.sendRunCompletedNotification(newRun, newRun.status.toLowerCase());
    }
    sendRunStartedNotification(run) {
        if (this.notifyWhenRunStartsPreference !== true) {
            debug('notifyWhenRunStarts not true, skipping notification for run #%s', run);
            return;
        }
        return tslib_1.__classPrivateFieldGet(this, _NotificationActions_instances, "m", _NotificationActions_showRunNotification).call(this, `Run #${run.runNumber} started`, run);
    }
    sendRunFailingNotification(run) {
        if (this.notifyWhenRunStartsFailingPreference !== true) {
            debug('notifyWhenRunStartsFailing not true, skipping notification for run #%s', run);
            return;
        }
        return tslib_1.__classPrivateFieldGet(this, _NotificationActions_instances, "m", _NotificationActions_showRunNotification).call(this, `Run #${run.runNumber} has started failing`, run);
    }
    sendRunCompletedNotification(run, status) {
        var _a;
        if (!((_a = this.notifyWhenRunCompletesPreference) === null || _a === void 0 ? void 0 : _a.includes(status))) {
            debug('notifyWhenRunCompletesPreference %s does not include %s, skipping notification for run #%s', this.notifyWhenRunCompletesPreference, status, run.runNumber);
            return;
        }
        return tslib_1.__classPrivateFieldGet(this, _NotificationActions_instances, "m", _NotificationActions_showRunNotification).call(this, `Run #${run.runNumber} ${status}`, run);
    }
}
exports.NotificationActions = NotificationActions;
_NotificationActions_instances = new WeakSet(), _NotificationActions_showRunNotification = async function _NotificationActions_showRunNotification(body, run) {
    var _a;
    try {
        const cloudProjectMetadata = (_a = this.ctx.coreData.cloudProject.metadata) !== null && _a !== void 0 ? _a : await this.ctx.actions.cloudProject.fetchMetadata();
        (0, assert_1.default)(cloudProjectMetadata === null || cloudProjectMetadata === void 0 ? void 0 : cloudProjectMetadata.name, 'cloudProject.name cannot be undefined');
        this.ctx.actions.electron.showSystemNotification(cloudProjectMetadata.name, body, () => this.onNotificationClick(run));
    }
    catch (e) {
        debug('error showing notification for run %i: %s', run.runNumber, e.message);
    }
};
