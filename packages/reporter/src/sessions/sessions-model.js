"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const mobx_1 = require("mobx");
const instrument_model_1 = tslib_1.__importDefault(require("../instruments/instrument-model"));
const utils_1 = require("./utils");
class Session extends instrument_model_1.default {
    constructor(props) {
        super(props);
        this.isGlobalSession = false;
        const { state, sessionInfo: { isGlobalSession, id, status } } = props;
        this.isGlobalSession = isGlobalSession;
        this.name = id;
        this.status = status;
        this.tagType = (0, utils_1.determineTagType)(state);
    }
    update(props) {
        const { state, sessionInfo } = props;
        this.status = (sessionInfo === null || sessionInfo === void 0 ? void 0 : sessionInfo.status) || '';
        this.tagType = (0, utils_1.determineTagType)(state || '');
    }
}
exports.default = Session;
tslib_1.__decorate([
    mobx_1.observable
], Session.prototype, "name", void 0);
tslib_1.__decorate([
    mobx_1.observable
], Session.prototype, "status", void 0);
tslib_1.__decorate([
    mobx_1.observable
], Session.prototype, "isGlobalSession", void 0);
tslib_1.__decorate([
    mobx_1.observable
], Session.prototype, "tagType", void 0);
