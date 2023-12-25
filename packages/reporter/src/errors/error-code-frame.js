"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const react_1 = tslib_1.__importStar(require("react"));
const mobx_react_1 = require("mobx-react");
const prismjs_1 = tslib_1.__importDefault(require("prismjs"));
const file_name_opener_1 = tslib_1.__importDefault(require("../lib/file-name-opener"));
let ErrorCodeFrame = class ErrorCodeFrame extends react_1.Component {
    componentDidMount() {
        prismjs_1.default.highlightAllUnder(this.refs.codeFrame);
    }
    render() {
        const { line, frame, language } = this.props.codeFrame;
        // since we pull out 2 lines above the highlighted code, it will always
        // be the 3rd line unless it's at the top of the file (lines 1 or 2)
        const highlightLine = Math.min(line, 3);
        return (react_1.default.createElement("div", { className: 'test-err-code-frame' },
            react_1.default.createElement(file_name_opener_1.default, { className: "runnable-err-file-path", fileDetails: this.props.codeFrame, hasIcon: true }),
            react_1.default.createElement("pre", { ref: 'codeFrame', "data-line": highlightLine },
                react_1.default.createElement("code", { className: `language-${language || 'text'}` }, frame))));
    }
};
ErrorCodeFrame = tslib_1.__decorate([
    mobx_react_1.observer
], ErrorCodeFrame);
exports.default = ErrorCodeFrame;
