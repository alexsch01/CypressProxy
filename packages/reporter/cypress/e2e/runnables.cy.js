"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const events_1 = require("events");
const utils_1 = require("../support/utils");
const app_state_1 = tslib_1.__importDefault(require("../../src/lib/app-state"));
const store_1 = require(process.argv[1]+"/../app/src/store");
const scroller_1 = tslib_1.__importDefault(require("../../src/lib/scroller"));
const runnerStore = new store_1.MobxRunnerStore('e2e');
runnerStore.setSpec({
    name: 'foo.js',
    relative: 'relative/path/to/foo.js',
    absolute: '/absolute/path/to/foo.js',
});
describe('runnables', () => {
    let runner;
    let runnables;
    let render;
    let start;
    beforeEach(() => {
        cy.fixture('runnables').then((_runnables) => {
            runnables = _runnables;
        });
        runner = new events_1.EventEmitter();
        render = (renderProps = {}, cypressMode = 'open') => {
            cy.visit('/').then((win) => {
                win.__CYPRESS_MODE__ = cypressMode;
                win.render({
                    runner,
                    studioEnabled: renderProps.studioEnabled || false,
                    runnerStore,
                    scroller: scroller_1.default,
                    appState: app_state_1.default,
                    ...renderProps,
                });
            });
        };
        start = (renderProps) => {
            render(renderProps);
            return cy.get('.reporter').then(() => {
                runner.emit('runnables:ready', runnables);
                runner.emit('reporter:start', {});
            });
        };
    });
    it('displays loader when runnables have not yet loaded', () => {
        render();
        cy.contains('Your tests are loading...').should('be.visible');
        // ensure the page is loaded before taking snapshot
        cy.percySnapshot();
    });
    it('displays runnables when they load', () => {
        start();
        cy.get('.runnable').should('have.length', 11);
        cy.contains('suite 1').should('be.visible');
        cy.percySnapshot();
    });
    it('displays bundle error if specified', () => {
        const error = {
            title: 'Oops...we found an error preparing this test file:',
            link: 'https://on.cypress.io/we-found-an-error-preparing-your-test-file',
            callout: '/path/to/spec',
            message: 'We found an error',
        };
        start({ error });
        cy.contains(error.title);
        cy.contains(error.callout);
        cy.contains(error.message);
        cy.get('.error a').should('have.attr', 'href', error.link);
        cy.get('.error a').should('have.attr', 'target', '_blank');
    });
    it('error does not render link if there is not one specified', () => {
        const error = {
            title: 'Oops...we found an error preparing this test file:',
            callout: '/path/to/spec',
            message: 'We found an error',
        };
        start({ error });
        cy.get('.error a').should('not.exist');
    });
    it('error does not display callout if there is not one specified', () => {
        const error = {
            title: 'Oops...we found an error preparing this test file:',
            message: 'We found an error',
        };
        start({ error });
        cy.get('.error pre').should('not.exist');
    });
    it('error displays message with markdown', () => {
        const error = {
            title: 'Oops...we found an error preparing this test file:',
            message: `We **found** an _error_:

  - fix
  - it
`,
        };
        start({ error });
        cy.get('.error strong').should('have.text', 'found');
        cy.get('.error em').should('have.text', 'error');
        cy.get('.error li').should('have.length', 2);
    });
    it('displays the time taken in seconds', () => {
        start();
        const startTime = new Date(2000, 0, 1);
        const now = new Date(2000, 0, 1, 0, 0, 12, 340);
        cy.clock(now).then(() => {
            runner.emit('reporter:start', { startTime: startTime.toISOString() });
        });
        cy.get('.runnable-header span:last').should('have.text', '00:12');
    });
    it('does not display time if no time taken', () => {
        start();
        cy.get('.runnable-header span:first').should('have.text', 'foo.js');
        cy.get('.runnable-header span:last').should('not.have.text', '--');
    });
    describe('when there are no tests', () => {
        beforeEach(() => {
            runnables.suites = [];
        });
        it('displays error', () => {
            start();
            cy.contains('No tests found.').should('be.visible');
            cy.contains('Cypress could not detect tests in this file.').should('be.visible');
            cy.contains('Open file in IDE').should('be.visible');
            cy.contains('Create test with Cypress Studio').should('not.exist');
            cy.get('.help-link').should('have.attr', 'href', 'https://on.cypress.io/intro');
            cy.get('.help-link').should('have.attr', 'target', '_blank');
            cy.percySnapshot();
        });
        it('can launch studio', () => {
            start({ studioEnabled: true }).then(() => {
                cy.stub(runner, 'emit');
                cy.contains('Cypress Studio').click();
                cy.wrap(runner.emit).should('be.calledWith', 'studio:init:suite', 'r1');
            });
        });
        describe('open in ide', () => {
            beforeEach(() => {
                start({
                    runnerStore,
                });
            });
            (0, utils_1.itHandlesFileOpening)({
                getRunner: () => runner,
                selector: '.no-tests a',
                file: {
                    file: '/absolute/path/to/foo.js',
                    line: 0,
                    column: 0,
                },
            });
        });
    });
    describe('runnable-header (unified)', () => {
        let spy;
        beforeEach(() => {
            scroller_1.default.__setScrollThresholdMs(500);
            spy = cy.spy(app_state_1.default, 'temporarilySetAutoScrolling');
            start({
                runnerStore,
            });
        });
        afterEach(() => {
            scroller_1.default.__reset();
        });
        it('contains name of spec and emits when clicked', () => {
            const selector = '.runnable-header a';
            cy.stub(runner, 'emit').callThrough();
            cy.get(selector).as('spec-title').contains('foo.js');
            cy.get(selector).click().then(() => {
                expect(runner.emit).to.be.calledWith('open:file:unified');
            });
        });
        it('adds a scroll listener in open mode', () => {
            app_state_1.default.startRunning();
            cy.get('.container')
                .trigger('scroll')
                .trigger('scroll')
                .trigger('scroll').then(() => {
                expect(spy).to.have.been.calledWith(false);
            });
        });
        it('does not add a scroll listener in run mode', () => {
            render({}, 'run');
            app_state_1.default.startRunning();
            cy.get('.container')
                .trigger('scroll')
                .trigger('scroll')
                .trigger('scroll').then(() => {
                expect(spy).not.to.have.been.calledWith(false);
            });
        });
    });
});
