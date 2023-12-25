"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataActions = void 0;
const tslib_1 = require("tslib");
const actions_1 = require("./actions");
const ErrorActions_1 = require("./actions/ErrorActions");
const EventCollectorActions_1 = require("./actions/EventCollectorActions");
const NotificationActions_1 = require("./actions/NotificationActions");
const VersionsActions_1 = require("./actions/VersionsActions");
const util_1 = require("./util");
class DataActions {
    constructor(ctx) {
        this.ctx = ctx;
    }
    get error() {
        return new ErrorActions_1.ErrorActions(this.ctx);
    }
    get file() {
        return new actions_1.FileActions(this.ctx);
    }
    get dev() {
        return new actions_1.DevActions(this.ctx);
    }
    get app() {
        return new actions_1.AppActions(this.ctx);
    }
    get auth() {
        return new actions_1.AuthActions(this.ctx);
    }
    get localSettings() {
        return new actions_1.LocalSettingsActions(this.ctx);
    }
    get wizard() {
        return new actions_1.WizardActions(this.ctx);
    }
    get project() {
        return new actions_1.ProjectActions(this.ctx);
    }
    get electron() {
        return new actions_1.ElectronActions(this.ctx);
    }
    get migration() {
        return new actions_1.MigrationActions(this.ctx);
    }
    get browser() {
        return new actions_1.BrowserActions(this.ctx);
    }
    get servers() {
        return new actions_1.ServersActions(this.ctx);
    }
    get versions() {
        return new VersionsActions_1.VersionsActions(this.ctx);
    }
    get eventCollector() {
        return new EventCollectorActions_1.EventCollectorActions(this.ctx);
    }
    get cohorts() {
        return new actions_1.CohortsActions(this.ctx);
    }
    get codegen() {
        return new actions_1.CodegenActions(this.ctx);
    }
    get notification() {
        return new NotificationActions_1.NotificationActions(this.ctx);
    }
    get cloudProject() {
        return new actions_1.CloudProjectActions(this.ctx);
    }
}
exports.DataActions = DataActions;
tslib_1.__decorate([
    util_1.cached
], DataActions.prototype, "error", null);
tslib_1.__decorate([
    util_1.cached
], DataActions.prototype, "file", null);
tslib_1.__decorate([
    util_1.cached
], DataActions.prototype, "dev", null);
tslib_1.__decorate([
    util_1.cached
], DataActions.prototype, "app", null);
tslib_1.__decorate([
    util_1.cached
], DataActions.prototype, "auth", null);
tslib_1.__decorate([
    util_1.cached
], DataActions.prototype, "localSettings", null);
tslib_1.__decorate([
    util_1.cached
], DataActions.prototype, "wizard", null);
tslib_1.__decorate([
    util_1.cached
], DataActions.prototype, "project", null);
tslib_1.__decorate([
    util_1.cached
], DataActions.prototype, "electron", null);
tslib_1.__decorate([
    util_1.cached
], DataActions.prototype, "migration", null);
tslib_1.__decorate([
    util_1.cached
], DataActions.prototype, "browser", null);
tslib_1.__decorate([
    util_1.cached
], DataActions.prototype, "servers", null);
tslib_1.__decorate([
    util_1.cached
], DataActions.prototype, "versions", null);
tslib_1.__decorate([
    util_1.cached
], DataActions.prototype, "eventCollector", null);
tslib_1.__decorate([
    util_1.cached
], DataActions.prototype, "cohorts", null);
tslib_1.__decorate([
    util_1.cached
], DataActions.prototype, "codegen", null);
tslib_1.__decorate([
    util_1.cached
], DataActions.prototype, "notification", null);
tslib_1.__decorate([
    util_1.cached
], DataActions.prototype, "cloudProject", null);
