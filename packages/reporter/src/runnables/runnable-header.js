"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const mobx_react_1 = require("mobx-react");
const react_1 = tslib_1.__importStar(require("react"));
const util_1 = require("../lib/util");
const file_name_opener_1 = tslib_1.__importDefault(require("../lib/file-name-opener"));
const renderRunnableHeader = (children) => react_1.default.createElement("div", { className: "runnable-header", "data-cy": "runnable-header" }, children);
let RunnableHeader = class RunnableHeader extends react_1.Component {
    render() {
        const { spec, statsStore } = this.props;
        const relativeSpecPath = spec.relative;
        if (spec.relative === '__all') {
            if (spec.specFilter) {
                return renderRunnableHeader(react_1.default.createElement("span", null,
                    react_1.default.createElement("span", null,
                        "Specs matching \"",
                        spec.specFilter,
                        "\"")));
            }
            return renderRunnableHeader(react_1.default.createElement("span", null,
                react_1.default.createElement("span", null, "All Specs")));
        }
        const displayFileName = () => {
            const specParts = (0, util_1.getFilenameParts)(spec.name);
            return (react_1.default.createElement(react_1.default.Fragment, null,
                react_1.default.createElement("strong", null, specParts[0]),
                specParts[1]));
        };
        const fileDetails = {
            absoluteFile: spec.absolute,
            column: 0,
            displayFile: displayFileName(),
            line: 0,
            originalFile: relativeSpecPath,
            relativeFile: relativeSpecPath,
        };
        return renderRunnableHeader(react_1.default.createElement(react_1.default.Fragment, null,
            react_1.default.createElement(file_name_opener_1.default, { fileDetails: fileDetails, hasIcon: true }),
            Boolean(statsStore.duration) && (react_1.default.createElement("span", { className: 'duration', "data-cy": "spec-duration" }, (0, util_1.formatDuration)(statsStore.duration)))));
    }
};
RunnableHeader = tslib_1.__decorate([
    mobx_react_1.observer
], RunnableHeader);
exports.default = RunnableHeader;
