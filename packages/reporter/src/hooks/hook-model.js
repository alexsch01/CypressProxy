"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const lodash_1 = tslib_1.__importDefault(require("lodash"));
const mobx_1 = require("mobx");
class Hook {
    constructor(props) {
        this.commands = [];
        this.failed = false;
        this._aliasesWithDuplicatesCache = null;
        this._currentNumber = 1;
        this.hookId = props.hookId;
        this.hookName = props.hookName;
        this.invocationDetails = props.invocationDetails;
        this.isStudio = !!props.isStudio;
    }
    get aliasesWithDuplicates() {
        // Consecutive duplicates only appear once in command array, but hasDuplicates is true
        // Non-consecutive duplicates appear multiple times in command array, but hasDuplicates is false
        // This returns aliases that have consecutive or non-consecutive duplicates
        let consecutiveDuplicateAliases = [];
        const aliases = this.commands.map((command) => {
            if (command.alias) {
                if (command.hasChildren) {
                    consecutiveDuplicateAliases.push(command.alias);
                }
                return command.alias;
            }
            return null;
        });
        const nonConsecutiveDuplicateAliases = aliases.filter((alias, i) => {
            return aliases.indexOf(alias) === i && aliases.lastIndexOf(alias) !== i;
        });
        const aliasesWithDuplicates = consecutiveDuplicateAliases.concat(nonConsecutiveDuplicateAliases);
        // do a deep compare here to see if we can use the cached aliases, which will allow mobx's
        // @computed identity comparison to pass, preventing unnecessary re-renders
        // https://github.com/cypress-io/cypress/issues/4411
        if (!lodash_1.default.isEqual(aliasesWithDuplicates, this._aliasesWithDuplicatesCache)) {
            this._aliasesWithDuplicatesCache = aliasesWithDuplicates;
        }
        return this._aliasesWithDuplicatesCache;
    }
    get hasFailedCommand() {
        return !!lodash_1.default.find(this.commands, { state: 'failed' });
    }
    get showStudioPrompt() {
        return this.isStudio && !this.hasFailedCommand && (!this.commands.length || (this.commands.length === 1 && this.commands[0].name === 'visit'));
    }
    addCommand(command) {
        if (!command.event && command.type !== 'system' && !this.isStudio) {
            command.number = this._currentNumber;
            this._currentNumber++;
        }
        if (this.isStudio && command.name === 'visit') {
            command.number = 1;
        }
        if (command.group) {
            const groupCommand = lodash_1.default.find(this.commands, { id: command.group });
            if (groupCommand && groupCommand.addChild) {
                groupCommand.addChild(command);
            }
            else {
                // if we cant find a command to attach to, treat this like an ordinary log
                command.group = undefined;
            }
        }
        const lastCommand = lodash_1.default.last(this.commands);
        if (lastCommand &&
            lastCommand.isMatchingEvent &&
            lastCommand.isMatchingEvent(command) &&
            lastCommand.addChild) {
            lastCommand.addChild(command);
        }
        else {
            this.commands.push(command);
        }
    }
    removeCommand(commandId) {
        const commandIndex = lodash_1.default.findIndex(this.commands, { id: commandId });
        this.commands.splice(commandIndex, 1);
    }
    commandMatchingErr(errToMatch) {
        return (0, lodash_1.default)(this.commands) // @ts-ignore
            .filter(({ err }) => {
            return err && err.message === errToMatch.message && err.message !== undefined;
        })
            .last();
    }
}
exports.default = Hook;
tslib_1.__decorate([
    mobx_1.observable
], Hook.prototype, "hookId", void 0);
tslib_1.__decorate([
    mobx_1.observable
], Hook.prototype, "hookName", void 0);
tslib_1.__decorate([
    mobx_1.observable
], Hook.prototype, "hookNumber", void 0);
tslib_1.__decorate([
    mobx_1.observable
], Hook.prototype, "invocationDetails", void 0);
tslib_1.__decorate([
    mobx_1.observable
], Hook.prototype, "invocationOrder", void 0);
tslib_1.__decorate([
    mobx_1.observable
], Hook.prototype, "commands", void 0);
tslib_1.__decorate([
    mobx_1.observable
], Hook.prototype, "isStudio", void 0);
tslib_1.__decorate([
    mobx_1.observable
], Hook.prototype, "failed", void 0);
tslib_1.__decorate([
    mobx_1.computed
], Hook.prototype, "aliasesWithDuplicates", null);
tslib_1.__decorate([
    mobx_1.computed
], Hook.prototype, "hasFailedCommand", null);
tslib_1.__decorate([
    mobx_1.computed
], Hook.prototype, "showStudioPrompt", null);
