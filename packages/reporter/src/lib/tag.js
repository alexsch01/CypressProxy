"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const classnames_1 = tslib_1.__importDefault(require("classnames"));
const react_1 = tslib_1.__importDefault(require("react"));
const react_tooltip_1 = tslib_1.__importDefault(require("@cypress/react-tooltip"));
const Tag = ({ content, count, customClassName, tooltipMessage, type, }) => {
    if (!content) {
        return null;
    }
    let tagContent = (react_1.default.createElement("span", { className: (0, classnames_1.default)('reporter-tag', 'reporter-tag-content', type, { 'reporter-tag-has-count': count }, customClassName) }, content));
    if (count) {
        const customCountClass = customClassName ? `${customClassName}-count` : undefined;
        tagContent = (react_1.default.createElement("span", null,
            tagContent,
            react_1.default.createElement("span", { className: (0, classnames_1.default)('reporter-tag', 'reporter-tag-count', type, customCountClass) }, count)));
    }
    if (!tooltipMessage) {
        return tagContent;
    }
    return (react_1.default.createElement(react_tooltip_1.default, { placement: 'top', title: tooltipMessage, className: 'cy-tooltip' }, tagContent));
};
exports.default = Tag;
