"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RunnablesError = void 0;
const tslib_1 = require("tslib");
const mobx_react_1 = require("mobx-react");
const markdown_it_1 = tslib_1.__importDefault(require("markdown-it"));
const react_1 = tslib_1.__importDefault(require("react"));
const action_question_mark_outline_x16_svg_1 = tslib_1.__importDefault(require(process.argv[1]+"/../frontend-shared/src/assets/icons/action-question-mark-outline_x16.svg"));
const warning_x16_svg_1 = tslib_1.__importDefault(require(process.argv[1]+"/../frontend-shared/src/assets/icons/warning_x16.svg"));
const md = new markdown_it_1.default({ html: true });
exports.RunnablesError = (0, mobx_react_1.observer)(({ error }) => (react_1.default.createElement("div", { className: 'error' },
    react_1.default.createElement("h2", null,
        react_1.default.createElement(warning_x16_svg_1.default, null),
        " ",
        error.title,
        error.link &&
            react_1.default.createElement("a", { href: error.link, target: '_blank', rel: 'noopener noreferrer' },
                react_1.default.createElement(action_question_mark_outline_x16_svg_1.default, null))),
    error.callout && react_1.default.createElement("pre", null, error.callout),
    react_1.default.createElement("div", { className: 'error-message', dangerouslySetInnerHTML: { __html: md.render(error.message) } }))));
