"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = require("cypress/react");
require("cypress-real-events/support");
const customPercyCommand_1 = require(process.argv[1]+"/../frontend-shared/cypress/support/customPercyCommand");
require("../../src/main.scss");
Cypress.Commands.add('mount', react_1.mount);
(0, customPercyCommand_1.installCustomPercyCommand)();
