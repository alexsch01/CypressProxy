"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const mobx_1 = require("mobx");
class Log {
    constructor(props) {
        this.id = props.id;
        this.alias = props.alias;
        this.aliasType = props.aliasType;
        this.displayName = props.displayName;
        this.name = props.name;
        this.message = props.message;
        this.type = props.type;
        this.state = props.state;
        this.referencesAlias = props.referencesAlias;
        this.testId = props.testId;
    }
    update(props) {
        this.alias = props.alias;
        this.aliasType = props.aliasType;
        this.displayName = props.displayName;
        this.name = props.name;
        this.message = props.message;
        this.type = props.type;
        this.state = props.state;
        this.referencesAlias = props.referencesAlias;
    }
}
exports.default = Log;
tslib_1.__decorate([
    mobx_1.observable.ref
], Log.prototype, "alias", void 0);
tslib_1.__decorate([
    mobx_1.observable
], Log.prototype, "aliasType", void 0);
tslib_1.__decorate([
    mobx_1.observable
], Log.prototype, "displayName", void 0);
tslib_1.__decorate([
    mobx_1.observable
], Log.prototype, "id", void 0);
tslib_1.__decorate([
    mobx_1.observable
], Log.prototype, "name", void 0);
tslib_1.__decorate([
    mobx_1.observable
], Log.prototype, "message", void 0);
tslib_1.__decorate([
    mobx_1.observable
], Log.prototype, "type", void 0);
tslib_1.__decorate([
    mobx_1.observable
], Log.prototype, "state", void 0);
tslib_1.__decorate([
    mobx_1.observable.ref
], Log.prototype, "referencesAlias", void 0);
