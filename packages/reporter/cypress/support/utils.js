"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addCommand = exports.itHandlesFileOpening = void 0;
const { _ } = Cypress;
const itHandlesFileOpening = ({ getRunner, selector, file, stackTrace = false }) => {
    describe('it handles file opening', () => {
        it('emits unified file open event', () => {
            cy.stub(getRunner(), 'emit').callThrough();
            if (stackTrace) {
                cy.contains('View stack trace').click();
            }
            cy.get(selector).first().click().then(() => {
                expect(getRunner().emit).to.be.calledWith('open:file:unified');
            });
        });
    });
};
exports.itHandlesFileOpening = itHandlesFileOpening;
const addCommand = (runner, log) => {
    const defaultLog = {
        event: false,
        hookId: 'r3',
        id: _.uniqueId('c'),
        instrument: 'command',
        renderProps: {},
        state: 'passed',
        testId: 'r3',
        testCurrentRetry: 0,
        timeout: 4000,
        type: 'parent',
        url: 'http://example.com',
        hasConsoleProps: true,
    };
    const commandLog = Object.assign(defaultLog, log);
    runner.emit('reporter:log:add', commandLog);
    // return command log id to enable adding new command to command group
    return commandLog.id;
};
exports.addCommand = addCommand;
