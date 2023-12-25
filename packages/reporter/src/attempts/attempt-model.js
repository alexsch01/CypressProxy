"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const lodash_1 = tslib_1.__importDefault(require("lodash"));
const mobx_1 = require("mobx");
const agent_model_1 = tslib_1.__importDefault(require("../agents/agent-model"));
const command_model_1 = tslib_1.__importDefault(require("../commands/command-model"));
const err_model_1 = tslib_1.__importDefault(require("../errors/err-model"));
const route_model_1 = tslib_1.__importDefault(require("../routes/route-model"));
const hook_model_1 = tslib_1.__importDefault(require("../hooks/hook-model"));
const sessions_model_1 = tslib_1.__importDefault(require("../sessions/sessions-model"));
class Attempt {
    constructor(props, test) {
        this.agents = [];
        this.sessions = {};
        this.commands = [];
        this.err = undefined;
        this.hooks = [];
        // TODO: make this an enum with states: 'QUEUED, ACTIVE, INACTIVE'
        this.isActive = null;
        this.routes = [];
        this._state = null;
        this._testOuterStatus = undefined;
        this._invocationCount = 0;
        this.hookCount = {
            'before all': 0,
            'before each': 0,
            'after all': 0,
            'after each': 0,
            'test body': 0,
            'studio commands': 0,
        };
        this._isOpen = null;
        this.isOpenWhenLast = null;
        this._callbackAfterUpdate = null;
        this._logs = {};
        this.addLog = (props) => {
            switch (props.instrument) {
                case 'command': {
                    if (props.sessionInfo) {
                        this._addSession(props); // add sessionInstrumentPanel details
                    }
                    return this._addCommand(props);
                }
                case 'agent': {
                    return this._addAgent(props);
                }
                case 'route': {
                    return this._addRoute(props);
                }
                default: {
                    throw new Error(`Attempted to add log for unknown instrument: ${props.instrument}`);
                }
            }
        };
        this.removeLog = (props) => {
            switch (props.instrument) {
                case 'command': {
                    return this._removeCommand(props);
                }
                default: {
                    throw new Error(`Attempted to remove log for instrument other than command`);
                }
            }
        };
        this.testId = props.id;
        this.id = props.currentRetry || 0;
        this.test = test;
        this._state = props.state;
        if (props.err) {
            this.err = new err_model_1.default(props.err);
        }
        this.invocationDetails = props.invocationDetails;
        this.hooks = lodash_1.default.map(props.hooks, (hook) => new hook_model_1.default(hook));
        lodash_1.default.each(props.agents, this.addLog);
        lodash_1.default.each(props.commands, this.addLog);
        lodash_1.default.each(props.routes, this.addLog);
    }
    get hasCommands() {
        return !!this.commands.length;
    }
    get isLongRunning() {
        return this.isActive && this._hasLongRunningCommand;
    }
    get _hasLongRunningCommand() {
        return lodash_1.default.some(this.commands, (command) => {
            return command.isLongRunning;
        });
    }
    get state() {
        return this._state || (this.isActive ? 'active' : 'processing');
    }
    get error() {
        var _a;
        const command = ((_a = this.err) === null || _a === void 0 ? void 0 : _a.isCommandErr) ? this.commandMatchingErr() : undefined;
        return {
            err: this.err,
            testId: command === null || command === void 0 ? void 0 : command.testId,
            commandId: command === null || command === void 0 ? void 0 : command.id,
        };
    }
    get isLast() {
        return this.id === this.test.lastAttempt.id;
    }
    get isOpen() {
        if (this._isOpen !== null) {
            return this._isOpen;
        }
        // prev attempts open by default while test is running, otherwise only the last is open
        return this.test.isActive || this.isLast;
    }
    updateLog(props) {
        const log = this._logs[props.id];
        if (log) {
            // @ts-ignore satisfied by CommandProps
            if (props.sessionInfo) {
                this._updateOrAddSession(props); // update sessionInstrumentPanel details
            }
            log.update(props);
        }
    }
    commandMatchingErr() {
        if (!this.err) {
            return undefined;
        }
        return (0, lodash_1.default)(this.hooks)
            .map((hook) => {
            // @ts-ignore
            return hook.commandMatchingErr(this.err);
        })
            .compact()
            .last();
    }
    start() {
        this.isActive = true;
    }
    update(props) {
        var _a;
        if (props.state) {
            this._state = props.state;
        }
        if ((_a = props._cypressTestStatusInfo) === null || _a === void 0 ? void 0 : _a.outerStatus) {
            this._testOuterStatus = props._cypressTestStatusInfo.outerStatus;
        }
        if (props.err) {
            if (this.err) {
                this.err.update(props.err);
            }
            else {
                this.err = new err_model_1.default(props.err);
            }
        }
        if (props.failedFromHookId) {
            const hook = lodash_1.default.find(this.hooks, { hookId: props.failedFromHookId });
            if (hook && props.err) {
                hook.failed = true;
            }
        }
        if (props.isOpen != null) {
            this.isOpenWhenLast = props.isOpen;
        }
    }
    finish(props, isInteractive) {
        this.update(props);
        this.isActive = false;
        // if the test is not open and we aren't in interactive mode, clear out the attempt details
        if (!this.test.isOpen && !isInteractive) {
            this._clear();
        }
    }
    _clear() {
        this.commands = [];
        this.routes = [];
        this.agents = [];
        this.hooks = [];
        this._logs = {};
        this.sessions = {};
    }
    _addAgent(props) {
        const agent = new agent_model_1.default(props);
        this._logs[props.id] = agent;
        this.agents.push(agent);
        return agent;
    }
    _addSession(props) {
        const session = new sessions_model_1.default(props);
        this.sessions[props.id] = session;
    }
    _updateOrAddSession(props) {
        const session = this.sessions[props.id];
        if (session) {
            session.update(props);
            return;
        }
        this._addSession(props);
    }
    _addRoute(props) {
        const route = new route_model_1.default(props);
        this._logs[props.id] = route;
        this.routes.push(route);
        return route;
    }
    _addCommand(props) {
        const command = new command_model_1.default(props);
        this._logs[props.id] = command;
        this.commands.push(command);
        const hookIndex = lodash_1.default.findIndex(this.hooks, { hookId: command.hookId });
        const hook = this.hooks[hookIndex];
        if (!hook)
            return;
        hook.addCommand(command);
        // make sure that hooks are in order of invocation
        if (hook.invocationOrder === undefined) {
            hook.invocationOrder = this._invocationCount++;
            if (hook.invocationOrder !== hookIndex) {
                this.hooks[hookIndex] = this.hooks[hook.invocationOrder];
                this.hooks[hook.invocationOrder] = hook;
            }
        }
        // assign number if non existent
        if (hook.hookNumber === undefined) {
            hook.hookNumber = ++this.hookCount[hook.hookName];
        }
        return command;
    }
    _removeCommand(props) {
        delete this._logs[props.id];
        const commandIndex = lodash_1.default.findIndex(this.commands, { id: props.id });
        this.commands.splice(commandIndex, 1);
        const hookIndex = lodash_1.default.findIndex(this.hooks, { hookId: props.hookId });
        const hook = this.hooks[hookIndex];
        hook.removeCommand(props.id);
    }
}
exports.default = Attempt;
tslib_1.__decorate([
    mobx_1.observable
], Attempt.prototype, "agents", void 0);
tslib_1.__decorate([
    mobx_1.observable
], Attempt.prototype, "sessions", void 0);
tslib_1.__decorate([
    mobx_1.observable
], Attempt.prototype, "commands", void 0);
tslib_1.__decorate([
    mobx_1.observable
], Attempt.prototype, "err", void 0);
tslib_1.__decorate([
    mobx_1.observable
], Attempt.prototype, "hooks", void 0);
tslib_1.__decorate([
    mobx_1.observable
], Attempt.prototype, "isActive", void 0);
tslib_1.__decorate([
    mobx_1.observable
], Attempt.prototype, "routes", void 0);
tslib_1.__decorate([
    mobx_1.observable
], Attempt.prototype, "_state", void 0);
tslib_1.__decorate([
    mobx_1.observable
], Attempt.prototype, "_testOuterStatus", void 0);
tslib_1.__decorate([
    mobx_1.observable
], Attempt.prototype, "_invocationCount", void 0);
tslib_1.__decorate([
    mobx_1.observable
], Attempt.prototype, "invocationDetails", void 0);
tslib_1.__decorate([
    mobx_1.observable
], Attempt.prototype, "hookCount", void 0);
tslib_1.__decorate([
    mobx_1.observable
], Attempt.prototype, "_isOpen", void 0);
tslib_1.__decorate([
    mobx_1.observable
], Attempt.prototype, "isOpenWhenLast", void 0);
tslib_1.__decorate([
    mobx_1.observable
], Attempt.prototype, "id", void 0);
tslib_1.__decorate([
    mobx_1.computed
], Attempt.prototype, "hasCommands", null);
tslib_1.__decorate([
    mobx_1.computed
], Attempt.prototype, "isLongRunning", null);
tslib_1.__decorate([
    mobx_1.computed
], Attempt.prototype, "_hasLongRunningCommand", null);
tslib_1.__decorate([
    mobx_1.computed
], Attempt.prototype, "state", null);
tslib_1.__decorate([
    mobx_1.computed
], Attempt.prototype, "error", null);
tslib_1.__decorate([
    mobx_1.computed
], Attempt.prototype, "isLast", null);
tslib_1.__decorate([
    mobx_1.computed
], Attempt.prototype, "isOpen", null);
tslib_1.__decorate([
    mobx_1.action
], Attempt.prototype, "start", null);
tslib_1.__decorate([
    mobx_1.action
], Attempt.prototype, "update", null);
tslib_1.__decorate([
    mobx_1.action
], Attempt.prototype, "finish", null);
