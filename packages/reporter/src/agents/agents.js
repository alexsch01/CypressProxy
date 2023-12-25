"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentsList = exports.Agent = void 0;
const tslib_1 = require("tslib");
const classnames_1 = tslib_1.__importDefault(require("classnames"));
const lodash_1 = tslib_1.__importDefault(require("lodash"));
const mobx_react_1 = require("mobx-react");
const react_1 = tslib_1.__importDefault(require("react"));
const collapsible_1 = tslib_1.__importDefault(require("../collapsible/collapsible"));
const Agent = (0, mobx_react_1.observer)(({ model }) => (react_1.default.createElement("tr", { className: (0, classnames_1.default)('agent-item', { 'no-calls': !model.callCount }) },
    react_1.default.createElement("td", null, model.name),
    react_1.default.createElement("td", null, model.functionName),
    react_1.default.createElement("td", null, [].concat(model.alias || []).join(', ')),
    react_1.default.createElement("td", { className: 'call-count' }, model.callCount || '-'))));
exports.Agent = Agent;
const AgentsList = (0, mobx_react_1.observer)(({ model }) => (react_1.default.createElement("tbody", null, lodash_1.default.map(model.agents, (agent) => react_1.default.createElement(Agent, { key: agent.id, model: agent })))));
exports.AgentsList = AgentsList;
const Agents = (0, mobx_react_1.observer)(({ model }) => {
    if (!model.agents.length) {
        return null;
    }
    return (react_1.default.createElement("div", { className: 'runnable-agents-region' },
        react_1.default.createElement("div", { className: 'instruments-container' },
            react_1.default.createElement("ul", { className: 'hooks-container' },
                react_1.default.createElement("li", { className: 'hook-item' },
                    react_1.default.createElement(collapsible_1.default, { header: `Spies / Stubs (${model.agents.length})`, headerClass: 'hook-header', contentClass: 'instrument-content' },
                        react_1.default.createElement("table", null,
                            react_1.default.createElement("thead", null,
                                react_1.default.createElement("tr", null,
                                    react_1.default.createElement("th", null, "Type"),
                                    react_1.default.createElement("th", null, "Function"),
                                    react_1.default.createElement("th", null, "Alias(es)"),
                                    react_1.default.createElement("th", { className: 'call-count' }, "# Calls"))),
                            react_1.default.createElement(AgentsList, { model: model }))))))));
});
exports.default = Agents;
