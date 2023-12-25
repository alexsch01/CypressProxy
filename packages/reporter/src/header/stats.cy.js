"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const app_state_1 = require("../lib/app-state");
const stats_store_1 = require("./stats-store");
const header_1 = tslib_1.__importDefault(require("./header"));
const react_1 = tslib_1.__importDefault(require("react"));
describe('stats score header', () => {
    it('Shows stats with more than 4 digit test count nicely', () => {
        const appState = new app_state_1.AppState();
        const statsStore = new stats_store_1.StatsStore();
        statsStore.start({ startTime: new Date().toISOString(), numPassed: 999999, numFailed: 999999, numPending: 999999 });
        statsStore.end();
        cy.mount(react_1.default.createElement(header_1.default, { statsStore: statsStore, appState: appState, runnablesStore: {} }));
        cy.percySnapshot();
    });
});
