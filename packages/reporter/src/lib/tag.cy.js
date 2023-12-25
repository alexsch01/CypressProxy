"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const react_1 = tslib_1.__importDefault(require("react"));
const tag_1 = tslib_1.__importDefault(require("./tag"));
describe('Tag', () => {
    const aliases = [
        'route',
        'agent',
        'primitive',
        'dom',
    ];
    const statuses = [
        'successful-status',
        'warned-status',
        'failed-status',
    ];
    const misc = [
        'count',
    ];
    const MockCommandContainer = ({ children }) => (react_1.default.createElement("div", { style: { backgroundColor: '#171926', minHeight: '20px' } }, children));
    it('types', () => {
        cy.mount(react_1.default.createElement(MockCommandContainer, null,
            react_1.default.createElement("h1", { style: { fontSize: '16px', paddingBottom: '5px' } }, "Tag Types"),
            react_1.default.createElement("h2", { style: { paddingBottom: '5px' } }, "Alias Tags:"),
            aliases.map((type) => (react_1.default.createElement("div", { key: type, style: { height: '20px' } },
                react_1.default.createElement(tag_1.default, { content: type, type: type })))),
            react_1.default.createElement("h2", { style: { paddingBottom: '5px' } }, "Status Tags:"),
            statuses.map((type) => (react_1.default.createElement("div", { key: type, style: { height: '20px' } },
                react_1.default.createElement(tag_1.default, { content: type, type: type })))),
            react_1.default.createElement("h2", { style: { paddingBottom: '5px' } }, "Misc Tags:"),
            misc.map((type) => (react_1.default.createElement("div", { key: type, style: { height: '20px' } },
                react_1.default.createElement(tag_1.default, { content: type, type: type }))))));
        aliases.concat(statuses).forEach((type) => {
            cy.contains(type);
        });
        cy.contains('dom').realHover();
        cy.get('.cy-tooltip').should('not.exist');
        cy.percySnapshot();
    });
    it('with count', () => {
        cy.mount(react_1.default.createElement(MockCommandContainer, null,
            react_1.default.createElement("h1", { style: { fontSize: '16px', paddingBottom: '5px' } }, "Tag Types"),
            react_1.default.createElement("h2", { style: { paddingBottom: '5px' } }, "Alias Tags:"),
            aliases.map((type, index) => (react_1.default.createElement("div", { key: type, style: { height: '20px' } },
                react_1.default.createElement(tag_1.default, { content: type, type: type, count: index }))))));
        aliases.forEach((type, index) => {
            if (index === 0) {
                return cy.contains(type).should('not.contain', index);
            }
            return cy.contains(type).siblings().contains(index);
        });
        cy.percySnapshot();
    });
    it('with tooltip', () => {
        cy.mount(react_1.default.createElement(MockCommandContainer, null,
            react_1.default.createElement(tag_1.default, { content: react_1.default.createElement("span", null, "Alias"), type: 'primitive', tooltipMessage: 'Alias was referenced!' })));
        cy.contains('Alias').realHover();
        cy.get('.cy-tooltip').contains('Alias was referenced!');
        cy.percySnapshot();
    });
    it('with customClassName', () => {
        cy.mount(react_1.default.createElement(MockCommandContainer, null,
            react_1.default.createElement(tag_1.default, { content: "Alias", type: 'primitive', count: 3, customClassName: "command-alias" })));
        cy.get('.reporter-tag').should('have.class', 'command-alias');
        cy.get('.reporter-tag-count').should('have.class', 'command-alias-count');
        cy.percySnapshot();
    });
});
