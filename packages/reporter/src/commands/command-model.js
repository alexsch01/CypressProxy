"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const lodash_1 = tslib_1.__importDefault(require("lodash"));
const mobx_1 = require("mobx");
const err_model_1 = tslib_1.__importDefault(require("../errors/err-model"));
const instrument_model_1 = tslib_1.__importDefault(require("../instruments/instrument-model"));
const LONG_RUNNING_THRESHOLD = 1000;
class Command extends instrument_model_1.default {
    get displayMessage() {
        return this.renderProps.message || this.message;
    }
    countNestedCommands(children) {
        if (children.length === 0) {
            return 0;
        }
        return children.length + children.reduce((previousValue, child) => previousValue + this.countNestedCommands(child.children), 0);
    }
    get numChildren() {
        if (this.event) {
            // add one to include self so it's the total number of same events
            return this.children.length + 1;
        }
        return this.countNestedCommands(this.children);
    }
    get isOpen() {
        var _a, _b, _c, _d;
        if (!this.hasChildren)
            return null;
        return this._isOpen || (this._isOpen === null
            && (((_a = this.err) === null || _a === void 0 ? void 0 : _a.isRecovered) ||
                (this.name === 'session' && this.state === 'failed') ||
                // command has nested commands
                (this.name !== 'session' && this.hasChildren && !this.event && this.type !== 'system') ||
                // command has nested commands with children
                (this.name !== 'session' && lodash_1.default.some(this.children, (v) => v.hasChildren)) ||
                // last nested command is open
                (this.name !== 'session' && ((_b = lodash_1.default.last(this.children)) === null || _b === void 0 ? void 0 : _b.isOpen)) ||
                // show slow command when test is running
                (lodash_1.default.some(this.children, (v) => v.isLongRunning) && ((_c = lodash_1.default.last(this.children)) === null || _c === void 0 ? void 0 : _c.state) === 'pending') ||
                // at last nested command failed
                ((_d = lodash_1.default.last(this.children)) === null || _d === void 0 ? void 0 : _d.state) === 'failed'));
    }
    toggleOpen() {
        this._isOpen = !this.isOpen;
    }
    get hasChildren() {
        if (this.event) {
            // if the command is an event log, we add one to the number of children count to include
            // itself in the total number of same events that render when the group is closed
            return this.numChildren > 1;
        }
        return this.numChildren > 0;
    }
    get showError() {
        var _a, _b;
        if (this.hasChildren) {
            return (((_a = this.err) === null || _a === void 0 ? void 0 : _a.isRecovered) && this.isOpen);
        }
        return (_b = this.err) === null || _b === void 0 ? void 0 : _b.isRecovered;
    }
    constructor(props) {
        super(props);
        this.renderProps = {};
        this.event = false;
        this.isLongRunning = false;
        this.children = [];
        this._isOpen = null;
        this._prevState = null;
        this._pendingTimeout = undefined;
        if (props.err) {
            this.err = new err_model_1.default(props.err);
        }
        this.event = props.event;
        this.number = props.number;
        this.numElements = props.numElements;
        this.renderProps = props.renderProps || {};
        this.sessionInfo = props.sessionInfo;
        this.timeout = props.timeout;
        // command log that are not associated with elements will not have a visibility
        // attribute set. i.e. cy.visit(), cy.readFile() or cy.log()
        this.visible = props.visible === undefined || props.visible;
        this.wallClockStartedAt = props.wallClockStartedAt;
        this.hookId = props.hookId;
        this.isStudio = !!props.isStudio;
        this.group = props.group;
        this.hasSnapshot = !!props.hasSnapshot;
        this.hasConsoleProps = !!props.hasConsoleProps;
        this.groupLevel = props.groupLevel || 0;
        this._checkLongRunning();
    }
    update(props) {
        super.update(props);
        if (props.err) {
            if (!this.err) {
                this.err = new err_model_1.default(props.err);
            }
            else {
                this.err.update(props.err);
            }
        }
        this.event = props.event;
        this.numElements = props.numElements;
        this.renderProps = props.renderProps || {};
        this.sessionInfo = props.sessionInfo;
        // command log that are not associated with elements will not have a visibility
        // attribute set. i.e. cy.visit(), cy.readFile() or cy.log()
        this.visible = props.visible === undefined || props.visible;
        this.timeout = props.timeout;
        this.hasSnapshot = props.hasSnapshot;
        this.hasConsoleProps = props.hasConsoleProps;
        this._checkLongRunning();
    }
    isMatchingEvent(command) {
        if (command.name === 'page load')
            return false;
        if (command.type === 'system')
            return false;
        return command.event && this.matches(command);
    }
    setGroup(id) {
        this.group = id;
    }
    addChild(command) {
        command.setGroup(this.id);
        this.children.push(command);
    }
    matches(command) {
        return (command.type === this.type &&
            command.name === this.name &&
            command.displayMessage === this.displayMessage);
    }
    // the following several methods track if the command's state has been
    // active for more than the LONG_RUNNING_THRESHOLD and set the
    // isLongRunning flag to true, which propagates up to the test to
    // auto-expand it
    _checkLongRunning() {
        if (this._becamePending()) {
            this._startTimingPending();
        }
        if (this._becameNonPending()) {
            clearTimeout(this._pendingTimeout);
        }
        this._prevState = this.state;
    }
    _startTimingPending() {
        this._pendingTimeout = setTimeout((0, mobx_1.action)('became:long:running', () => {
            if (this._isPending()) {
                this.isLongRunning = true;
            }
        }), LONG_RUNNING_THRESHOLD);
    }
    _becamePending() {
        return !this._wasPending() && this._isPending();
    }
    _becameNonPending() {
        return this._wasPending() && !this._isPending();
    }
    _wasPending() {
        return this._prevState === 'pending';
    }
    _isPending() {
        return this.state === 'pending';
    }
}
exports.default = Command;
tslib_1.__decorate([
    mobx_1.observable.struct
], Command.prototype, "renderProps", void 0);
tslib_1.__decorate([
    mobx_1.observable.struct
], Command.prototype, "sessionInfo", void 0);
tslib_1.__decorate([
    mobx_1.observable
], Command.prototype, "err", void 0);
tslib_1.__decorate([
    mobx_1.observable
], Command.prototype, "event", void 0);
tslib_1.__decorate([
    mobx_1.observable
], Command.prototype, "isLongRunning", void 0);
tslib_1.__decorate([
    mobx_1.observable
], Command.prototype, "number", void 0);
tslib_1.__decorate([
    mobx_1.observable
], Command.prototype, "numElements", void 0);
tslib_1.__decorate([
    mobx_1.observable
], Command.prototype, "timeout", void 0);
tslib_1.__decorate([
    mobx_1.observable
], Command.prototype, "visible", void 0);
tslib_1.__decorate([
    mobx_1.observable
], Command.prototype, "wallClockStartedAt", void 0);
tslib_1.__decorate([
    mobx_1.observable
], Command.prototype, "children", void 0);
tslib_1.__decorate([
    mobx_1.observable
], Command.prototype, "hookId", void 0);
tslib_1.__decorate([
    mobx_1.observable
], Command.prototype, "isStudio", void 0);
tslib_1.__decorate([
    mobx_1.observable
], Command.prototype, "group", void 0);
tslib_1.__decorate([
    mobx_1.observable
], Command.prototype, "groupLevel", void 0);
tslib_1.__decorate([
    mobx_1.observable
], Command.prototype, "hasSnapshot", void 0);
tslib_1.__decorate([
    mobx_1.observable
], Command.prototype, "hasConsoleProps", void 0);
tslib_1.__decorate([
    mobx_1.observable
], Command.prototype, "_isOpen", void 0);
tslib_1.__decorate([
    mobx_1.computed
], Command.prototype, "displayMessage", null);
tslib_1.__decorate([
    mobx_1.computed
], Command.prototype, "numChildren", null);
tslib_1.__decorate([
    mobx_1.computed
], Command.prototype, "isOpen", null);
tslib_1.__decorate([
    mobx_1.action
], Command.prototype, "toggleOpen", null);
tslib_1.__decorate([
    mobx_1.computed
], Command.prototype, "hasChildren", null);
tslib_1.__decorate([
    mobx_1.computed
], Command.prototype, "showError", null);
tslib_1.__decorate([
    mobx_1.action
], Command.prototype, "setGroup", null);
