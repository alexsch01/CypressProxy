"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const react_1 = tslib_1.__importDefault(require("react"));
const hooks_1 = require("./hooks");
require("../main.scss");
describe('hooks/hooks.tsx', () => {
    it('should mount', () => {
        const model = {
            failed: false,
            hookName: 'TEST BODY',
        };
        cy.mount(react_1.default.createElement("div", { className: "runnable suite" },
            react_1.default.createElement("div", { className: "hooks-container" },
                react_1.default.createElement(hooks_1.Hook, { model: model, showNumber: false }))));
        cy.percySnapshot();
        cy.contains('TEST BODY').click().realHover();
        cy.percySnapshot();
    });
});
