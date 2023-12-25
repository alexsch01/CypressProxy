"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppState = void 0;
const tslib_1 = require("tslib");
const lodash_1 = tslib_1.__importDefault(require("lodash"));
const mobx_1 = require("mobx");
// these are used for the `reset` method
// so only a subset of the initial values are declared here
const defaults = {
    isPaused: false,
    isRunning: false,
    isPreferencesMenuOpen: false,
    nextCommandName: null,
    pinnedSnapshotId: null,
    studioActive: false,
};
class AppState {
    constructor() {
        this.autoScrollingUserPref = true;
        this.autoScrollingEnabled = true;
        this.isSpecsListOpen = false;
        this.isPaused = defaults.isPaused;
        this.isRunning = defaults.isRunning;
        this.isPreferencesMenuOpen = defaults.isPreferencesMenuOpen;
        this.nextCommandName = defaults.nextCommandName;
        this.pinnedSnapshotId = defaults.pinnedSnapshotId;
        this.studioActive = defaults.studioActive;
        this.isStopped = false;
        this._resetAutoScrollingEnabledTo = true;
    }
    startRunning() {
        this.isRunning = true;
        this.isStopped = false;
    }
    pause(nextCommandName) {
        this.isPaused = true;
        this.nextCommandName = nextCommandName;
    }
    resume() {
        this.isPaused = false;
        this.nextCommandName = null;
    }
    stop() {
        this.isStopped = true;
    }
    end() {
        this.isRunning = false;
        this._resetAutoScrolling();
    }
    temporarilySetAutoScrolling(isEnabled) {
        if (isEnabled != null) {
            this.autoScrollingEnabled = isEnabled;
        }
    }
    toggleAutoScrolling() {
        this.setAutoScrolling(!this.autoScrollingEnabled);
    }
    /**
     * Toggles the auto-scrolling user preference to true|false. This method should only be called from the
     * preferences menu itself.
     */
    toggleAutoScrollingUserPref() {
        this.setAutoScrollingUserPref(!this.autoScrollingUserPref);
    }
    toggleSpecList() {
        this.isSpecsListOpen = !this.isSpecsListOpen;
    }
    togglePreferencesMenu() {
        this.isPreferencesMenuOpen = !this.isPreferencesMenuOpen;
    }
    setSpecsList(status) {
        this.isSpecsListOpen = status;
    }
    setAutoScrolling(isEnabled) {
        if (isEnabled != null) {
            this._resetAutoScrollingEnabledTo = isEnabled;
            this.autoScrollingEnabled = isEnabled;
        }
    }
    /**
     * Sets the auto scroll user preference to true|false.
     * When this preference is set, it overrides any temporary auto scrolling behaviors that may be in effect.
     * @param {boolean | null | undefined} isEnabled - whether or not auto scroll should be enabled or disabled.
     * If not a boolean, this method is a no-op.
     */
    setAutoScrollingUserPref(isEnabled) {
        if (isEnabled != null) {
            this.autoScrollingUserPref = isEnabled;
            this.setAutoScrolling(isEnabled);
        }
    }
    setStudioActive(studioActive) {
        this.studioActive = studioActive;
    }
    reset() {
        lodash_1.default.each(defaults, (value, key) => {
            this[key] = value;
        });
        this._resetAutoScrolling();
    }
    _resetAutoScrolling() {
        this.autoScrollingEnabled = this._resetAutoScrollingEnabledTo;
    }
}
exports.AppState = AppState;
tslib_1.__decorate([
    mobx_1.observable
], AppState.prototype, "autoScrollingUserPref", void 0);
tslib_1.__decorate([
    mobx_1.observable
], AppState.prototype, "autoScrollingEnabled", void 0);
tslib_1.__decorate([
    mobx_1.observable
], AppState.prototype, "isSpecsListOpen", void 0);
tslib_1.__decorate([
    mobx_1.observable
], AppState.prototype, "isPaused", void 0);
tslib_1.__decorate([
    mobx_1.observable
], AppState.prototype, "isRunning", void 0);
tslib_1.__decorate([
    mobx_1.observable
], AppState.prototype, "isPreferencesMenuOpen", void 0);
tslib_1.__decorate([
    mobx_1.observable
], AppState.prototype, "nextCommandName", void 0);
tslib_1.__decorate([
    mobx_1.observable
], AppState.prototype, "pinnedSnapshotId", void 0);
tslib_1.__decorate([
    mobx_1.observable
], AppState.prototype, "studioActive", void 0);
exports.default = new AppState();
