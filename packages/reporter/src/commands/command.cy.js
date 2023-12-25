"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const react_1 = tslib_1.__importDefault(require("react"));
const command_1 = tslib_1.__importDefault(require("./command"));
const command_model_1 = tslib_1.__importDefault(require("./command-model"));
describe('commands', () => {
    describe('test states', () => {
        it('warned command', () => {
            cy.mount(react_1.default.createElement("div", null,
                react_1.default.createElement(command_1.default, { key: status, model: new command_model_1.default({
                        name: 'session',
                        message: 'user1',
                        state: 'warned',
                        sessionInfo: {
                            id: 'user1',
                            isGlobalSession: false,
                            status: 'recreated',
                        },
                        number: 1,
                        type: 'parent',
                        hookId: '1',
                        testId: '1',
                        id: 1,
                        numElements: 1,
                    }) })));
            cy.percySnapshot();
        });
    });
    describe('sessionPill', () => {
        const statusList = [
            {
                state: 'pending',
                status: 'creating',
            },
            {
                state: 'passed',
                status: 'created',
            },
            {
                state: 'pending',
                status: 'restoring',
            },
            {
                state: 'passed',
                status: 'restored',
            },
            {
                state: 'warned',
                status: 'recreating',
            },
            {
                state: 'warned',
                status: 'recreated',
            },
            {
                state: 'failed',
                status: 'failed',
            },
        ];
        it('session status in command', () => {
            cy.mount(react_1.default.createElement("div", null, statusList.map(({ state, status }, index) => (react_1.default.createElement(command_1.default, { key: status, model: new command_model_1.default({
                    name: 'session',
                    message: 'user1',
                    state,
                    sessionInfo: {
                        id: 'user1',
                        isGlobalSession: false,
                        status,
                    },
                    number: index,
                    type: 'parent',
                    hookId: '1',
                    testId: '1',
                    id: index,
                    numElements: 1,
                }) })))));
            cy.percySnapshot();
        });
    });
});
