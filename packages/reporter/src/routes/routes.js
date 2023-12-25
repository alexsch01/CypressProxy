"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoutesList = exports.Route = void 0;
const tslib_1 = require("tslib");
const classnames_1 = tslib_1.__importDefault(require("classnames"));
const lodash_1 = tslib_1.__importDefault(require("lodash"));
const mobx_react_1 = require("mobx-react");
const react_1 = tslib_1.__importDefault(require("react"));
// @ts-ignore
const react_tooltip_1 = tslib_1.__importDefault(require("@cypress/react-tooltip"));
const collapsible_1 = tslib_1.__importDefault(require("../collapsible/collapsible"));
const tag_1 = tslib_1.__importDefault(require("../lib/tag"));
const Route = (0, mobx_react_1.observer)(({ model }) => (react_1.default.createElement("tr", { className: (0, classnames_1.default)('route-item', { 'no-responses': !model.numResponses }) },
    react_1.default.createElement("td", { className: 'route-method' }, model.method),
    react_1.default.createElement("td", { className: 'route-url' }, model.url),
    react_1.default.createElement("td", { className: 'route-is-stubbed' }, model.isStubbed ? 'Yes' : 'No'),
    react_1.default.createElement("td", { className: 'route-alias' },
        react_1.default.createElement(tag_1.default, { tooltipMessage: `Aliased this route as: '${model.alias}'`, type: 'route', customClassName: 'route-alias-name', content: model.alias })),
    react_1.default.createElement("td", { className: 'route-num-responses' }, model.numResponses || '-'))));
exports.Route = Route;
const RoutesList = (0, mobx_react_1.observer)(({ model }) => (react_1.default.createElement("tbody", null, lodash_1.default.map(model.routes, (route) => react_1.default.createElement(Route, { key: route.id, model: route })))));
exports.RoutesList = RoutesList;
const Routes = (0, mobx_react_1.observer)(({ model }) => {
    if (!model.routes.length) {
        return null;
    }
    return (react_1.default.createElement("div", { className: (0, classnames_1.default)('runnable-routes-region', {
            'no-routes': !model.routes.length,
        }) },
        react_1.default.createElement("div", { className: 'instruments-container' },
            react_1.default.createElement("ul", { className: 'hooks-container' },
                react_1.default.createElement("li", { className: 'hook-item' },
                    react_1.default.createElement(collapsible_1.default, { header: `Routes (${model.routes.length})`, headerClass: 'hook-header', contentClass: 'instrument-content' },
                        react_1.default.createElement("table", null,
                            react_1.default.createElement("thead", null,
                                react_1.default.createElement("tr", null,
                                    react_1.default.createElement("th", null, "Method"),
                                    react_1.default.createElement("th", null, "Route Matcher"),
                                    react_1.default.createElement("th", null, "Stubbed"),
                                    react_1.default.createElement("th", null, "Alias"),
                                    react_1.default.createElement("th", null,
                                        react_1.default.createElement(react_tooltip_1.default, { placement: 'top', title: 'Number of responses which matched this route', className: 'cy-tooltip' },
                                            react_1.default.createElement("span", null, "#"))))),
                            react_1.default.createElement(RoutesList, { model: model }))))))));
});
exports.default = Routes;
