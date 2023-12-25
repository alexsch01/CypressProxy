"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("cypress-real-events/support");
// @ts-ignore
const customPercyCommand_1 = require(process.argv[1]+"/../frontend-shared/cypress/support/customPercyCommand");
(0, customPercyCommand_1.installCustomPercyCommand)({
    before() {
        cy.get('.toggle-specs-text').should('be.visible');
    },
    elementOverrides: {
        '.command-progress': true,
        '.cy-tooltip': true,
    },
});
