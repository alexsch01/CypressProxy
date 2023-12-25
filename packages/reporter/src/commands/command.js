"use strict";
var Command_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.Progress = exports.Message = exports.AliasesReferences = exports.Aliases = exports.formattedMessage = void 0;
const tslib_1 = require("tslib");
const lodash_1 = tslib_1.__importDefault(require("lodash"));
const classnames_1 = tslib_1.__importDefault(require("classnames"));
const markdown_it_1 = tslib_1.__importDefault(require("markdown-it"));
const mobx_1 = require("mobx");
const mobx_react_1 = require("mobx-react");
const react_1 = tslib_1.__importStar(require("react"));
const react_tooltip_1 = tslib_1.__importDefault(require("@cypress/react-tooltip"));
const app_state_1 = tslib_1.__importDefault(require("../lib/app-state"));
const events_1 = tslib_1.__importDefault(require("../lib/events"));
const flash_on_click_1 = tslib_1.__importDefault(require("../lib/flash-on-click"));
const state_icon_1 = tslib_1.__importDefault(require("../lib/state-icon"));
const tag_1 = tslib_1.__importDefault(require("../lib/tag"));
const runnables_store_1 = tslib_1.__importDefault(require("../runnables/runnables-store"));
const utils_1 = require("../sessions/utils");
const test_error_1 = tslib_1.__importDefault(require("../errors/test-error"));
const chevron_down_small_x8_svg_1 = tslib_1.__importDefault(require(process.argv[1]+"/../frontend-shared/src/assets/icons/chevron-down-small_x8.svg"));
const general_eye_closed_x16_svg_1 = tslib_1.__importDefault(require(process.argv[1]+"/../frontend-shared/src/assets/icons/general-eye-closed_x16.svg"));
const object_pin_x16_svg_1 = tslib_1.__importDefault(require(process.argv[1]+"/../frontend-shared/src/assets/icons/object-pin_x16.svg"));
const status_running_x16_svg_1 = tslib_1.__importDefault(require(process.argv[1]+"/../frontend-shared/src/assets/icons/status-running_x16.svg"));
const displayName = (model) => model.displayName || model.name;
const nameClassName = (name) => name.replace(/(\s+)/g, '-');
const mdBreaks = new markdown_it_1.default({ breaks: true });
const md = new markdown_it_1.default();
const formattedMessage = (message, type) => {
    if (!message)
        return '';
    const searchText = ['to match', 'to equal'];
    const regex = new RegExp(searchText.join('|'));
    const split = message.split(regex);
    const matchingText = searchText.find((text) => message.includes(text));
    const textToConvert = [split[0].trim(), ...(matchingText ? [matchingText] : [])].join(' ');
    const spaceEscapedText = textToConvert.replace(/^ +/gm, (initialSpaces) => '&#32;'.repeat(initialSpaces.length)); // &#32 is the HTML entity for a space
    // we don't want <br> in our error messages, but allow it in Cypress.log
    const converted = type === 'error' ? md.renderInline(spaceEscapedText) : mdBreaks.renderInline(spaceEscapedText);
    const assertion = (split[1] && [`<strong>${split[1].trim()}</strong>`]) || [];
    return [converted, ...assertion].join(' ');
};
exports.formattedMessage = formattedMessage;
const invisibleMessage = (model) => {
    return model.numElements > 1 ?
        'One or more matched elements are not visible.' :
        'This element is not visible.';
};
const numberOfChildrenMessage = (numChildren, event) => {
    if (event) {
        return `This event occurred ${numChildren} times`;
    }
    return `${numChildren} ${numChildren > 1 ? 'logs' : 'log'} currently hidden`;
};
const shouldShowCount = (aliasesWithDuplicates, aliasName, model) => {
    if (model.aliasType !== 'route') {
        return false;
    }
    return lodash_1.default.includes(aliasesWithDuplicates, aliasName);
};
/**
 * NavColumns Rules:
 *   > Command Number Column
 *      - When the command is executing, it is pending and renders the pending icon
 *      - When the command is finished, it displays the command number
 *        - Commands will render a command number, where Events and System logs do not
 *      - When the command is finished and the user has pinned the log, it displays the pin icon
 *
 *   > Expander Column
 *      - When the log is a group log and it has children logs, it will display the chevron icon
 */
const NavColumns = (0, mobx_react_1.observer)(({ model, isPinned, toggleColumnPin }) => (react_1.default.createElement(react_1.default.Fragment, null,
    react_1.default.createElement("div", { className: 'command-number-column', onClick: toggleColumnPin },
        model._isPending() && react_1.default.createElement(status_running_x16_svg_1.default, { "data-cy": "reporter-running-icon", className: 'fa-spin' }),
        (!model._isPending() && isPinned) && react_1.default.createElement(object_pin_x16_svg_1.default, { className: 'command-pin' }),
        (!model._isPending() && !isPinned) && model.number),
    model.hasChildren && (react_1.default.createElement("div", { className: 'command-expander-column', onClick: () => model.toggleOpen() },
        react_1.default.createElement(chevron_down_small_x8_svg_1.default, { className: (0, classnames_1.default)('command-expander', { 'command-expander-is-open': model.hasChildren && !!model.isOpen }) }))))));
const AliasReference = (0, mobx_react_1.observer)(({ aliasObj, model, aliasesWithDuplicates }) => {
    const showCount = shouldShowCount(aliasesWithDuplicates, aliasObj.name, model);
    const toolTipMessage = showCount ? `Found ${aliasObj.ordinal} alias for: '${aliasObj.name}'` : `Found an alias for: '${aliasObj.name}'`;
    return (react_1.default.createElement(tag_1.default, { content: `@${aliasObj.name}`, type: model.aliasType, count: showCount ? aliasObj.cardinal : undefined, tooltipMessage: toolTipMessage, customClassName: 'command-alias' }));
});
const AliasesReferences = (0, mobx_react_1.observer)(({ model, aliasesWithDuplicates }) => {
    const aliases = [].concat(model.referencesAlias);
    if (!aliases.length) {
        return null;
    }
    return (react_1.default.createElement("span", { className: 'command-aliases' }, aliases.map((aliasObj) => (react_1.default.createElement(AliasReference, { key: aliasObj.name + aliasObj.cardinal, aliasObj: aliasObj, model: model, aliasesWithDuplicates: aliasesWithDuplicates })))));
});
exports.AliasesReferences = AliasesReferences;
const Interceptions = (0, mobx_react_1.observer)(({ interceptions, wentToOrigin, status }) => {
    if (!(interceptions === null || interceptions === void 0 ? void 0 : interceptions.length)) {
        return null;
    }
    const interceptsTitle = (react_1.default.createElement("span", null,
        wentToOrigin ? '' : react_1.default.createElement(react_1.default.Fragment, null,
            "This request did not go to origin because the response was stubbed.",
            react_1.default.createElement("br", null)),
        "This request matched:",
        react_1.default.createElement("ul", null, interceptions === null || interceptions === void 0 ? void 0 : interceptions.map(({ command, alias, type }, i) => (react_1.default.createElement("li", { key: i },
            react_1.default.createElement("code", null,
                "cy.",
                command,
                "()"),
            " ",
            type,
            " with ",
            alias ? react_1.default.createElement(react_1.default.Fragment, null,
                "alias ",
                react_1.default.createElement("code", null,
                    "@",
                    alias)) : 'no alias'))))));
    const count = interceptions.length;
    const displayAlias = interceptions[count - 1].alias;
    return (react_1.default.createElement(tag_1.default, { content: react_1.default.createElement(react_1.default.Fragment, null,
            status && react_1.default.createElement("span", { className: 'status' },
                status,
                " "),
            displayAlias || react_1.default.createElement("em", { className: 'no-alias' }, "no alias")), count: count > 1 ? count : undefined, type: 'route', tooltipMessage: interceptsTitle, customClassName: 'command-interceptions' }));
});
const Aliases = (0, mobx_react_1.observer)(({ model }) => {
    if (!model.alias || model.aliasType === 'route')
        return null;
    const aliases = [].concat(model.alias);
    return (react_1.default.createElement("span", null, aliases.map((alias) => {
        const aliases = [alias];
        if (model.hasChildren && !model.isOpen) {
            aliases.push(...lodash_1.default.compact(model.children.map((dupe) => dupe.alias)));
        }
        return (react_1.default.createElement(tag_1.default, { key: alias, content: aliases.join(', '), type: model.aliasType, tooltipMessage: `${model.displayMessage} aliased as: ${aliases.map((alias) => `'${alias}'`).join(', ')}`, customClassName: 'command-alias' }));
    })));
});
exports.Aliases = Aliases;
const Message = (0, mobx_react_1.observer)(({ model }) => (react_1.default.createElement("span", { className: 'command-message' },
    !!model.renderProps.indicator && (react_1.default.createElement("i", { className: (0, classnames_1.default)(model.renderProps.wentToOrigin ? 'fas' : 'far', 'fa-circle', `command-message-indicator-${model.renderProps.indicator}`) })),
    !!model.displayMessage && react_1.default.createElement("span", { className: 'command-message-text', dangerouslySetInnerHTML: { __html: (0, exports.formattedMessage)(model.displayMessage) } }))));
exports.Message = Message;
const Progress = (0, mobx_react_1.observer)(({ model }) => {
    if (model.state !== 'pending' || !model.timeout || !model.wallClockStartedAt) {
        return null;
    }
    const timeElapsed = Date.now() - new Date(model.wallClockStartedAt).getTime();
    const timeRemaining = model.timeout ? model.timeout - timeElapsed : 0;
    const percentageRemaining = timeRemaining / model.timeout || 0;
    // we add a key to the span to ensure a rerender and restart of the animation on change
    return (react_1.default.createElement("div", { className: 'command-progress' },
        react_1.default.createElement("span", { style: { animationDuration: `${timeRemaining}ms`, transform: `scaleX(${percentageRemaining})` }, key: timeRemaining })));
});
exports.Progress = Progress;
const CommandDetails = (0, mobx_react_1.observer)(({ model, groupId, aliasesWithDuplicates }) => (react_1.default.createElement("span", { className: (0, classnames_1.default)('command-info') },
    react_1.default.createElement("span", { className: 'command-method' },
        react_1.default.createElement("span", null, model.event && model.type !== 'system' ? `(${displayName(model)})` : displayName(model))),
    !!groupId && model.type === 'system' && model.state === 'failed' && react_1.default.createElement(state_icon_1.default, { "aria-hidden": true, className: 'failed-indicator', state: model.state }),
    model.referencesAlias ?
        react_1.default.createElement(AliasesReferences, { model: model, aliasesWithDuplicates: aliasesWithDuplicates })
        : react_1.default.createElement(Message, { model: model }))));
const CommandControls = (0, mobx_react_1.observer)(({ model, commandName, events }) => {
    var _a;
    const displayNumOfElements = model.state !== 'pending' && model.numElements != null && model.numElements !== 1;
    const isSystemEvent = model.type === 'system' && model.event;
    const isSessionCommand = commandName === 'session';
    const displayNumOfChildren = !isSystemEvent && !isSessionCommand && model.hasChildren && !model.isOpen;
    const _removeStudioCommand = (e) => {
        e.preventDefault();
        e.stopPropagation();
        events.emit('studio:remove:command', model.number);
    };
    return (react_1.default.createElement("span", { className: 'command-controls' },
        model.type === 'parent' && model.isStudio && (react_1.default.createElement("i", { className: 'far fa-times-circle studio-command-remove', onClick: _removeStudioCommand })),
        isSessionCommand && (react_1.default.createElement(tag_1.default, { content: (_a = model.sessionInfo) === null || _a === void 0 ? void 0 : _a.status, type: (0, utils_1.determineTagType)(model.state) })),
        !model.visible && (react_1.default.createElement(react_tooltip_1.default, { placement: 'top', title: invisibleMessage(model), className: 'cy-tooltip' },
            react_1.default.createElement("span", null,
                react_1.default.createElement(general_eye_closed_x16_svg_1.default, { className: 'command-invisible' })))),
        displayNumOfElements && (react_1.default.createElement(tag_1.default, { content: model.numElements.toString(), type: 'count', tooltipMessage: `${model.numElements} matched elements`, customClassName: 'num-elements' })),
        react_1.default.createElement("span", { className: 'alias-container' },
            react_1.default.createElement(Interceptions, { ...model.renderProps }),
            react_1.default.createElement(Aliases, { model: model }),
            displayNumOfChildren && (react_1.default.createElement(tag_1.default, { content: model.numChildren, type: 'count', tooltipMessage: numberOfChildrenMessage(model.numChildren, model.event), customClassName: 'num-children' })))));
});
let Command = Command_1 = class Command extends react_1.Component {
    constructor() {
        super(...arguments);
        this.isOpen = null;
        this._shouldShowClickMessage = () => {
            return !this.props.appState.isRunning && !!this.props.model.hasConsoleProps;
        };
        this._toggleColumnPin = () => {
            if (this.props.appState.isRunning)
                return;
            const { testId, id } = this.props.model;
            if (this._isPinned()) {
                this.props.appState.pinnedSnapshotId = null;
                this.props.events.emit('unpin:snapshot', testId, id);
                this._snapshot(true);
            }
            else {
                this.props.appState.pinnedSnapshotId = id;
                this.props.events.emit('pin:snapshot', testId, id);
                this.props.events.emit('show:command', testId, id);
            }
        };
    }
    render() {
        const { model, aliasesWithDuplicates } = this.props;
        if (model.group && this.props.groupId !== model.group) {
            return null;
        }
        const commandName = model.name ? nameClassName(model.name) : '';
        const groupPlaceholder = [];
        let groupLevel = 0;
        if (model.groupLevel !== undefined) {
            // cap the group nesting to 5 levels to keep the log text legible
            groupLevel = model.groupLevel < 6 ? model.groupLevel : 5;
            for (let i = 1; i < groupLevel; i++) {
                groupPlaceholder.push(react_1.default.createElement("span", { key: `${this.props.groupId}-${i}`, className: 'command-group-block' }));
            }
        }
        return (react_1.default.createElement(react_1.default.Fragment, null,
            react_1.default.createElement("li", { className: (0, classnames_1.default)('command', `command-name-${commandName}`, { 'command-is-studio': model.isStudio }) },
                react_1.default.createElement("div", { className: (0, classnames_1.default)('command-wrapper', `command-state-${model.state}`, `command-type-${model.type}`, {
                        'command-is-event': !!model.event,
                        'command-is-pinned': this._isPinned(),
                        'command-is-interactive': (model.hasConsoleProps || model.hasSnapshot),
                    }) },
                    react_1.default.createElement(NavColumns, { model: model, isPinned: this._isPinned(), toggleColumnPin: this._toggleColumnPin }),
                    react_1.default.createElement(flash_on_click_1.default, { message: 'Printed output to your console', onClick: this._toggleColumnPin, shouldShowMessage: this._shouldShowClickMessage, wrapperClassName: (0, classnames_1.default)('command-pin-target', { 'command-group': !!this.props.groupId }) },
                        react_1.default.createElement("div", { className: 'command-wrapper-text', onMouseEnter: () => this._snapshot(true), onMouseLeave: () => this._snapshot(false) },
                            groupPlaceholder,
                            react_1.default.createElement(CommandDetails, { model: model, groupId: this.props.groupId, aliasesWithDuplicates: aliasesWithDuplicates }),
                            react_1.default.createElement(CommandControls, { model: model, commandName: commandName, events: this.props.events })))),
                react_1.default.createElement(Progress, { model: model }),
                this._children()),
            model.showError && (react_1.default.createElement("li", null,
                react_1.default.createElement(test_error_1.default, { err: model.err, testId: model.testId, commandId: model.id, 
                    // if the err is recovered and the current command is a log group, nest the test error within the group
                    groupLevel: model.group && model.hasChildren ? ++groupLevel : groupLevel })))));
    }
    _children() {
        const { appState, events, model, runnablesStore } = this.props;
        if (!model.hasChildren || !model.isOpen) {
            return null;
        }
        return (react_1.default.createElement("ul", { className: 'command-child-container' }, model.children.map((child) => (react_1.default.createElement(Command_1, { key: child.id, model: child, appState: appState, events: events, runnablesStore: runnablesStore, aliasesWithDuplicates: null, groupId: model.id })))));
    }
    _isPinned() {
        return this.props.appState.pinnedSnapshotId === this.props.model.id;
    }
    // snapshot rules
    //
    // 1. when we hover over a command, wait 50 ms
    // if we're still hovering, send show:snapshot
    //
    // 2. when we hover off a command, wait 50 ms
    // and if we are still in a non-showing state
    // meaning we have moused over nothing instead
    // of a different command, send hide:snapshot
    //
    // this prevents heavy CPU usage when hovering
    // up and down over commands. it also prevents
    // restoring to the original through all of that.
    // additionally when quickly moving your mouse
    // over many commands, unless you're hovered for
    // 50ms, it won't show the snapshot at all. so we
    // optimize for both snapshot showing + restoring
    _snapshot(show) {
        const { model, runnablesStore } = this.props;
        if (show) {
            runnablesStore.attemptingShowSnapshot = true;
            this._showTimeout = setTimeout(() => {
                runnablesStore.showingSnapshot = true;
                this.props.events.emit('show:snapshot', model.testId, model.id);
            }, 50);
        }
        else {
            runnablesStore.attemptingShowSnapshot = false;
            clearTimeout(this._showTimeout);
            setTimeout(() => {
                // if we are currently showing a snapshot but
                // we aren't trying to show a different snapshot
                if (runnablesStore.showingSnapshot && !runnablesStore.attemptingShowSnapshot) {
                    runnablesStore.showingSnapshot = false;
                    this.props.events.emit('hide:snapshot', model.testId, model.id);
                }
            }, 50);
        }
    }
};
Command.defaultProps = {
    appState: app_state_1.default,
    events: events_1.default,
    runnablesStore: runnables_store_1.default,
};
tslib_1.__decorate([
    mobx_1.observable
], Command.prototype, "isOpen", void 0);
tslib_1.__decorate([
    mobx_1.action
], Command.prototype, "_toggleColumnPin", void 0);
Command = Command_1 = tslib_1.__decorate([
    mobx_react_1.observer
], Command);
exports.default = Command;
