"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const react_1 = tslib_1.__importDefault(require("react"));
const test_1 = tslib_1.__importDefault(require("./test"));
describe('test/test.tsx', () => {
    it('should mount', () => {
        const model = {
            isOpen: false,
            level: 0,
            state: 'passed',
            title: 'foobar',
            attempts: [],
        };
        const appState = {
            studioActive: false,
        };
        cy.mount(react_1.default.createElement("div", { className: "runnable suite" },
            react_1.default.createElement(test_1.default, { model: model, appState: appState, studioEnabled: false })));
        cy.percySnapshot();
        cy.contains('foobar').click().realHover();
        cy.get('[data-cy="launch-studio"]').should('not.exist');
        cy.percySnapshot();
    });
    it('should mount with studio enabled', () => {
        const model = {
            isOpen: false,
            level: 0,
            state: 'passed',
            title: 'foobar',
            attempts: [],
        };
        const appState = {
            studioActive: false,
        };
        cy.mount(react_1.default.createElement("div", { className: "runnable suite" },
            react_1.default.createElement(test_1.default, { model: model, appState: appState, studioEnabled: true })));
        cy.percySnapshot();
        cy.contains('foobar').click().realHover();
        cy.get('[data-cy="launch-studio"]').should('exist');
        cy.percySnapshot();
    });
});
