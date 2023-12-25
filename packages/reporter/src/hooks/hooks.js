"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HookHeader = exports.Hook = void 0;
const tslib_1 = require("tslib");
const classnames_1 = tslib_1.__importDefault(require("classnames"));
const lodash_1 = tslib_1.__importDefault(require("lodash"));
const mobx_react_1 = require("mobx-react");
const react_1 = tslib_1.__importDefault(require("react"));
const app_state_1 = tslib_1.__importDefault(require("../lib/app-state"));
const command_1 = tslib_1.__importDefault(require("../commands/command"));
const collapsible_1 = tslib_1.__importDefault(require("../collapsible/collapsible"));
const arrow_right_x16_svg_1 = tslib_1.__importDefault(require(process.argv[1]+"/../frontend-shared/src/assets/icons/arrow-right_x16.svg"));
const technology_code_editor_x16_svg_1 = tslib_1.__importDefault(require(process.argv[1]+"/../frontend-shared/src/assets/icons/technology-code-editor_x16.svg"));
const open_file_in_ide_1 = tslib_1.__importDefault(require("../lib/open-file-in-ide"));
const HookHeader = ({ model, number }) => (react_1.default.createElement("span", { className: 'hook-name', "data-cy": `hook-name-${model.hookName}` },
    model.hookName,
    " ",
    number && `(${number})`,
    model.failed && react_1.default.createElement("span", { className: 'hook-failed-message' }, " (failed)")));
exports.HookHeader = HookHeader;
const HookOpenInIDE = ({ invocationDetails }) => {
    return (react_1.default.createElement(open_file_in_ide_1.default, { fileDetails: invocationDetails, className: 'hook-open-in-ide' },
        react_1.default.createElement(technology_code_editor_x16_svg_1.default, { viewBox: "0 0 16 16", width: "12", height: "12" }),
        " ",
        react_1.default.createElement("span", null, "Open in IDE")));
};
const StudioNoCommands = () => (react_1.default.createElement("li", { className: 'command command-name-get command-state-pending command-type-parent studio-prompt' },
    react_1.default.createElement("span", null,
        react_1.default.createElement("div", { className: 'command-wrapper' },
            react_1.default.createElement("div", { className: 'command-wrapper-text' },
                react_1.default.createElement("span", { className: 'command-message' },
                    react_1.default.createElement("span", { className: 'command-message-text' }, "Interact with your site to add test commands. Right click to add assertions.")),
                react_1.default.createElement("span", { className: 'command-controls' },
                    react_1.default.createElement(arrow_right_x16_svg_1.default, null)))))));
const Hook = (0, mobx_react_1.observer)(({ model, showNumber }) => (react_1.default.createElement("li", { className: (0, classnames_1.default)('hook-item', { 'hook-failed': model.failed, 'hook-studio': model.isStudio }) },
    react_1.default.createElement(collapsible_1.default, { header: react_1.default.createElement(HookHeader, { model: model, number: showNumber ? model.hookNumber : undefined }), headerClass: 'hook-header', headerExtras: model.invocationDetails && Cypress.testingType !== 'component' && react_1.default.createElement(HookOpenInIDE, { invocationDetails: model.invocationDetails }), isOpen: true },
        react_1.default.createElement("ul", { className: 'commands-container' },
            lodash_1.default.map(model.commands, (command) => react_1.default.createElement(command_1.default, { key: command.id, model: command, aliasesWithDuplicates: model.aliasesWithDuplicates })),
            model.showStudioPrompt && react_1.default.createElement(StudioNoCommands, null))))));
exports.Hook = Hook;
const Hooks = (0, mobx_react_1.observer)(({ state = app_state_1.default, model }) => (react_1.default.createElement("ul", { className: 'hooks-container' }, lodash_1.default.map(model.hooks, (hook) => {
    if (hook.commands.length || (hook.isStudio && state.studioActive && model.state === 'passed')) {
        return react_1.default.createElement(Hook, { key: hook.hookId, model: hook, showNumber: model.hookCount[hook.hookName] > 1 });
    }
    return null;
}))));
exports.default = Hooks;
