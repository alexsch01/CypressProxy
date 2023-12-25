"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const classnames_1 = tslib_1.__importDefault(require("classnames"));
const react_1 = tslib_1.__importStar(require("react"));
const util_1 = require("../lib/util");
const chevron_down_small_x8_svg_1 = tslib_1.__importDefault(require(process.argv[1]+"/../frontend-shared/src/assets/icons/chevron-down-small_x8.svg"));
class Collapsible extends react_1.Component {
    constructor(props) {
        super(props);
        this._toggleOpen = () => {
            this.setState({ isOpen: !this.state.isOpen });
        };
        this._onClick = (e) => {
            e.stopPropagation();
            this._toggleOpen();
        };
        this._onKeyPress = () => {
            this._toggleOpen();
        };
        this.state = { isOpen: props.isOpen || false };
    }
    componentDidUpdate(prevProps) {
        if (this.props.isOpen != null && this.props.isOpen !== prevProps.isOpen) {
            this.setState({ isOpen: this.props.isOpen });
        }
    }
    render() {
        return (react_1.default.createElement("div", { className: (0, classnames_1.default)('collapsible', { 'is-open': this.state.isOpen }), ref: this.props.containerRef },
            react_1.default.createElement("div", { className: (0, classnames_1.default)('collapsible-header-wrapper', this.props.headerClass) },
                react_1.default.createElement("div", { "aria-expanded": this.state.isOpen, className: 'collapsible-header', onClick: this._onClick, onKeyPress: (0, util_1.onEnterOrSpace)(this._onKeyPress), role: 'button', tabIndex: 0 },
                    react_1.default.createElement("div", { className: 'collapsible-header-inner', style: this.props.headerStyle, tabIndex: -1 },
                        !this.props.hideExpander && react_1.default.createElement(chevron_down_small_x8_svg_1.default, { className: 'collapsible-indicator' }),
                        react_1.default.createElement("span", { className: 'collapsible-header-text' }, this.props.header))),
                this.props.headerExtras),
            this.state.isOpen && (react_1.default.createElement("div", { className: (0, classnames_1.default)('collapsible-content', this.props.contentClass) }, this.props.children))));
    }
}
Collapsible.defaultProps = {
    isOpen: false,
    headerClass: '',
    headerStyle: {},
    contentClass: '',
    hideExpander: false,
};
exports.default = Collapsible;
