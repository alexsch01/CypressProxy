"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const lodash_1 = tslib_1.__importDefault(require("lodash"));
const react_1 = tslib_1.__importDefault(require("react"));
const classnames_1 = tslib_1.__importDefault(require("classnames"));
const mobx_react_1 = require("mobx-react");
const markdown_it_1 = tslib_1.__importDefault(require("markdown-it"));
const collapsible_1 = tslib_1.__importDefault(require("../collapsible/collapsible"));
const error_code_frame_1 = tslib_1.__importDefault(require("../errors/error-code-frame"));
const error_stack_1 = tslib_1.__importDefault(require("../errors/error-stack"));
const events_1 = tslib_1.__importDefault(require("../lib/events"));
const flash_on_click_1 = tslib_1.__importDefault(require("../lib/flash-on-click"));
const util_1 = require("../lib/util");
const command_1 = require("../commands/command");
const warning_x8_svg_1 = tslib_1.__importDefault(require(process.argv[1]+"/../frontend-shared/src/assets/icons/warning_x8.svg"));
const technology_terminal_x16_svg_1 = tslib_1.__importDefault(require(process.argv[1]+"/../frontend-shared/src/assets/icons/technology-terminal_x16.svg"));
const DocsUrl = ({ url }) => {
    if (!url)
        return null;
    const openUrl = (url) => (e) => {
        e.preventDefault();
        events_1.default.emit('external:open', url);
    };
    const urlArray = lodash_1.default.castArray(url);
    return lodash_1.default.map(urlArray, (url) => (react_1.default.createElement("a", { className: 'runnable-err-docs-url', href: url, key: url, onClick: openUrl(url) }, "Learn more")));
};
const TestError = (props) => {
    const { err } = props;
    if (!err || !err.displayMessage)
        return null;
    const md = new markdown_it_1.default('zero');
    md.enable(['backticks', 'emphasis', 'escape']);
    const onPrint = () => {
        events_1.default.emit('show:error', props);
    };
    const _onPrintClick = (e) => {
        e.stopPropagation();
        onPrint();
    };
    const { codeFrame } = err;
    const groupPlaceholder = [];
    if (err.isRecovered) {
        // cap the group nesting to 5 levels to keep the log text legible
        for (let i = 0; i < props.groupLevel; i++) {
            groupPlaceholder.push(react_1.default.createElement("span", { key: `${err.name}-err-${i}`, className: 'err-group-block' }));
        }
    }
    return (react_1.default.createElement("div", { className: (0, classnames_1.default)('runnable-err', { 'recovered-test-err': err.isRecovered }) },
        react_1.default.createElement("div", { className: 'runnable-err-header' },
            groupPlaceholder,
            react_1.default.createElement(warning_x8_svg_1.default, null),
            react_1.default.createElement("div", { className: 'runnable-err-name' }, err.name)),
        react_1.default.createElement("div", { className: 'runnable-err-body' },
            groupPlaceholder,
            react_1.default.createElement("div", { className: 'runnable-err-content' },
                react_1.default.createElement("div", { className: 'runnable-err-message' },
                    react_1.default.createElement("span", { dangerouslySetInnerHTML: { __html: (0, command_1.formattedMessage)(err.message, 'error') } }),
                    react_1.default.createElement(DocsUrl, { url: err.docsUrl })),
                codeFrame && react_1.default.createElement(error_code_frame_1.default, { codeFrame: codeFrame }),
                err.stack &&
                    react_1.default.createElement(collapsible_1.default, { header: 'View stack trace', headerClass: 'runnable-err-stack-expander', headerExtras: react_1.default.createElement(flash_on_click_1.default, { onClick: _onPrintClick, message: "Printed output to your console" },
                            react_1.default.createElement("div", { className: "runnable-err-print", onKeyPress: (0, util_1.onEnterOrSpace)(onPrint), role: 'button', tabIndex: 0 },
                                react_1.default.createElement("div", { tabIndex: -1 },
                                    react_1.default.createElement(technology_terminal_x16_svg_1.default, null),
                                    " ",
                                    react_1.default.createElement("span", null, "Print to console")))), contentClass: 'runnable-err-stack-trace' },
                        react_1.default.createElement(error_stack_1.default, { err: err }))))));
};
TestError.defaultProps = {
    groupLevel: 0,
};
exports.default = (0, mobx_react_1.observer)(TestError);
