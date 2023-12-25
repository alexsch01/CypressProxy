"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VersionsActions = void 0;
class VersionsActions {
    constructor(ctx) {
        this.ctx = ctx;
    }
    /**
     * Resets the latest version call so that it will be queried again with additional telemetry about the user
     */
    resetLatestVersionTelemetry() {
        this.ctx.versions.resetLatestVersionTelemetry();
    }
}
exports.VersionsActions = VersionsActions;
