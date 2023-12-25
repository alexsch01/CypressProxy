"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const suite_model_1 = tslib_1.__importDefault(require("../../../src/runnables/suite-model"));
const suiteWithChildren = (children) => {
    const suite = new suite_model_1.default({ id: '1', title: '', hooks: [] }, 0);
    suite.children = children;
    return suite;
};
describe('Suite model', () => {
    context('state', () => {
        it('is failed when any children have failed', () => {
            const suite = suiteWithChildren([{ state: 'passed' }, { state: 'failed' }]);
            expect(suite.state).to.equal('failed');
        });
        it('is pending when all children are pending', () => {
            const suite = suiteWithChildren([{ state: 'pending' }, { state: 'pending' }]);
            expect(suite.state).to.equal('pending');
        });
        it('is passed when all children are passed', () => {
            const suite = suiteWithChildren([{ state: 'passed' }, { state: 'passed' }]);
            expect(suite.state).to.equal('passed');
        });
        it('is passed when all children are passed or pending', () => {
            const suite = suiteWithChildren([{ state: 'passed' }, { state: 'pending' }]);
            expect(suite.state).to.equal('passed');
        });
        it('is passed when there are no children', () => {
            const suite = suiteWithChildren([]);
            expect(suite.state).to.equal('passed');
        });
        it('is processing when all children are active', () => {
            const suite = suiteWithChildren([{ state: 'active' }, { state: 'active' }]);
            expect(suite.state).to.equal('processing');
        });
        it('is processing when there are active tests with passing tests', () => {
            const suite = suiteWithChildren([{ state: 'active' }, { state: 'passed' }]);
            expect(suite.state).to.equal('processing');
        });
        it('is processing when there are active tests with pending tests', () => {
            const suite = suiteWithChildren([{ state: 'active' }, { state: 'pending' }]);
            expect(suite.state).to.equal('processing');
        });
        it('is processing when all children are processing', () => {
            const suite = suiteWithChildren([{ state: 'processing' }, { state: 'processing' }]);
            expect(suite.state).to.equal('processing');
        });
        it('is processing when there are processing tests with passing tests', () => {
            const suite = suiteWithChildren([{ state: 'processing' }, { state: 'passed' }]);
            expect(suite.state).to.equal('processing');
        });
        it('is processing when there are processing tests with pending tests', () => {
            const suite = suiteWithChildren([{ state: 'processing' }, { state: 'pending' }]);
            expect(suite.state).to.equal('processing');
        });
    });
});
