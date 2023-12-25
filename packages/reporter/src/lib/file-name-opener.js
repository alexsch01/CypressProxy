"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const mobx_react_1 = require("mobx-react");
const react_1 = tslib_1.__importDefault(require("react"));
// @ts-ignore
const react_tooltip_1 = tslib_1.__importDefault(require("@cypress/react-tooltip"));
const document_text_x16_svg_1 = tslib_1.__importDefault(require(process.argv[1]+"/../frontend-shared/src/assets/icons/document-text_x16.svg"));
const open_file_in_ide_1 = tslib_1.__importDefault(require("./open-file-in-ide"));
/**
 * Renders a link-style element that presents a tooltip on hover
 * and opens the file in an external editor when selected.
 */
const FileNameOpener = (0, mobx_react_1.observer)((props) => {
    const { displayFile, originalFile, line, column } = props.fileDetails;
    return (react_1.default.createElement(react_tooltip_1.default, { title: 'Open in IDE', wrapperClassName: props.className, className: 'cy-tooltip' },
        react_1.default.createElement("span", null,
            react_1.default.createElement(open_file_in_ide_1.default, { fileDetails: props.fileDetails },
                react_1.default.createElement("a", { href: "#", onClick: (e) => e.preventDefault() },
                    props.hasIcon && (react_1.default.createElement(document_text_x16_svg_1.default, null)),
                    displayFile || originalFile,
                    !!line && `:${line}`,
                    !!column && `:${column}`)))));
});
exports.default = FileNameOpener;
