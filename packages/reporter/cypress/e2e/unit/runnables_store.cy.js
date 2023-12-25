"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const sinon_1 = tslib_1.__importDefault(require("sinon"));
const runnables_store_1 = tslib_1.__importStar(require("../../../src/runnables/runnables-store"));
const appStateStub = () => {
    return {
        isRunning: true,
        autoScrollingEnabled: true,
    };
};
const scrollerStub = () => {
    return {
        setScrollTop: sinon_1.default.spy(),
        scrollToEnd: sinon_1.default.spy(),
    };
};
const createHook = (hookId) => {
    return { hookId, hookName: 'before each' };
};
const createTest = (id) => {
    return { id, title: `test ${id}`, hooks: [], state: 'processing', currentRetry: 0 };
};
const createSuite = (id, tests, suites) => {
    return { id, title: `suite ${id}`, tests, suites, hooks: [] };
};
const createAgent = (id, testId) => {
    return { id, testId, instrument: 'agent', callCount: 0, testCurrentRetry: 0, functionName: 'foo' };
};
const createCommand = (id, testId, hookId) => {
    return { id, testId, instrument: 'command', hookId };
};
const createRoute = (id, testId) => {
    return { id, testId, instrument: 'route' };
};
const createRootRunnable = () => {
    return {
        tests: [createTest('1')],
        suites: [
            createSuite('1', [createTest('2'), createTest('3')], [createSuite('3', [createTest('4')], []), createSuite('4', [createTest('5')], [])]),
            createSuite('2', [createTest('6')], []),
        ],
    };
};
describe('runnables store', () => {
    let instance;
    let appState;
    let scroller;
    beforeEach(() => {
        // @ts-ignore
        global.requestAnimationFrame = (cb) => {
            // @ts-ignore
            return cb();
        };
        appState = appStateStub();
        scroller = scrollerStub();
        instance = new runnables_store_1.RunnablesStore({ appState, scroller });
    });
    it('exports singleton by default', () => {
        expect(runnables_store_1.default).to.be.instanceof(runnables_store_1.RunnablesStore);
    });
    context('#setRunnables', () => {
        it('creates nested array of runnables', () => {
            instance.setRunnables(createRootRunnable());
            expect(instance.runnables.length).to.equal(3);
            expect(instance.runnables[0].title).to.equal('test 1');
            expect(instance.runnables[1].children.length).to.equal(4);
            expect(instance.runnables[2].children.length).to.equal(1);
        });
        it('sets the appropriate types', () => {
            instance.setRunnables(createRootRunnable());
            expect(instance.runnables[0].type).to.equal('test');
            expect(instance.runnables[1].type).to.equal('suite');
        });
        it('adds logs to tests when specified', () => {
            const rootRunnable = createRootRunnable();
            rootRunnable.tests[0].agents = [createAgent(1, '1'), createAgent(2, '1'), createAgent(3, '1')];
            rootRunnable.tests[0].commands = [createCommand(1, '1', 'h1')];
            rootRunnable.tests[0].routes = [createRoute(1, '1'), createRoute(2, '1')];
            rootRunnable.tests[0].hooks = [createHook('h1')];
            instance.setRunnables(rootRunnable);
            expect(instance.runnables[0].lastAttempt.agents.length).to.equal(3);
            expect(instance.runnables[0].lastAttempt.commands.length).to.equal(1);
            expect(instance.runnables[0].lastAttempt.routes.length).to.equal(2);
        });
        it('sets the appropriate nesting levels', () => {
            instance.setRunnables(createRootRunnable());
            expect(instance.runnables[0].level).to.equal(0);
            expect(instance.runnables[1].level).to.equal(0);
            expect(instance.runnables[1].children[0].level).to.equal(1);
            expect(instance.runnables[1].children[2].children[0].level).to.equal(2);
        });
        it('merges down hooks', () => {
            const rootRunnable = createRootRunnable();
            rootRunnable.suites[0].hooks = [createHook('h1'), createHook('h2')];
            rootRunnable.suites[0].suites[0].hooks = [createHook('h3')];
            rootRunnable.suites[0].suites[0].tests[0].hooks = [createHook('h4')];
            instance.setRunnables(rootRunnable);
            expect(instance.runnables[0].hooks.length).to.equal(2);
            expect(instance.runnables[1].hooks.length).to.equal(2);
            expect(instance.runnables[1].children[2].hooks.length).to.equal(3);
            expect(instance.runnables[1].children[2].children[0].hooks.length).to.equal(6);
        });
        it('sets .isReady flag', () => {
            instance.setRunnables({});
            expect(instance.isReady).to.be.true;
        });
        it('sets .hasTests flag to true if there are tests', () => {
            instance.setRunnables(createRootRunnable());
            expect(instance.hasTests).to.be.true;
        });
        it('sets .hasTests flag to false if there are no tests', () => {
            instance.setRunnables({ tests: [], suites: [createSuite('1', [], []), createSuite('2', [], [])] });
            expect(instance.hasTests).to.be.false;
        });
        it('sets .hasSingleTest flag to true if there is only one test', () => {
            instance.setRunnables({ tests: [], suites: [createSuite('1', [], []), createSuite('2', [createTest('1')], [])] });
            expect(instance.hasSingleTest).to.be.true;
        });
        it('sets .hasSingleTest flag to false if there are no tests', () => {
            instance.setRunnables({ tests: [], suites: [createSuite('1', [], []), createSuite('2', [], [])] });
            expect(instance.hasSingleTest).to.be.false;
        });
        it('sets .hasSingleTest flag to false if there are multiple tests', () => {
            instance.setRunnables(createRootRunnable());
            expect(instance.hasSingleTest).to.be.false;
        });
        it('sets scrollTop when app is running and initial scrollTop has been set', () => {
            instance.setInitialScrollTop(234);
            instance.setRunnables({});
            expect(scroller.setScrollTop).to.have.been.calledWith(234);
        });
        it('does nothing when app is running and initial scrollTop has not been set', () => {
            instance.setRunnables({});
            expect(scroller.setScrollTop).not.to.have.been.called;
        });
        it('sets scrolls to end when app is not running and auto-scrolling is enabled', () => {
            appState.isRunning = false;
            instance.setRunnables({});
            expect(scroller.scrollToEnd).to.have.been.called;
        });
        it('does nothing when app is not running and auto-scrolling is disabled', () => {
            appState.isRunning = false;
            appState.autoScrollingEnabled = false;
            instance.setRunnables({});
            expect(scroller.scrollToEnd).not.to.have.been.called;
        });
        it('does nothing when app is stopped and auto-scrolling is enabled', () => {
            appState.isRunning = false;
            appState.isStopped = true;
            instance.setRunnables({});
            expect(scroller.scrollToEnd).not.to.have.been.called;
        });
    });
    context('#runnableStarted', () => {
        it('starts the test with the given id', () => {
            instance.setRunnables({ tests: [createTest('1')], suites: [] });
            instance.runnableStarted({ id: '1' });
            expect(instance.runnables[0].isActive).to.be.true;
        });
    });
    context('#runnableFinished', () => {
        it('finishes the test with the given id', () => {
            instance.setRunnables({ tests: [createTest('1')], suites: [] });
            instance.runnableStarted({ id: '1' });
            instance.runnableFinished({ id: '1' });
            expect(instance.runnables[0].isActive).to.be.false;
        });
    });
    context('#testByid', () => {
        it('returns the test with the given id', () => {
            instance.setRunnables({ tests: [createTest('1'), createTest('3')], suites: [] });
            expect(instance.testById('3').title).to.be.equal('test 3');
        });
    });
    context('#addLog', () => {
        it('adds the log', () => {
            const test = createTest('1');
            test.hooks = [createHook('h1')];
            instance.setRunnables({ tests: [test] });
            instance.addLog(createCommand(1, '1', 'h1'));
            expect(instance.testById('1').lastAttempt.commands.length).to.equal(1);
            instance.addLog(createCommand(2, '1', 'h1'));
            expect(instance.testById('1').lastAttempt.commands.length).to.equal(2);
        });
    });
    context('#updateLog', () => {
        it('updates the log', () => {
            const test = createTest('1');
            test.hooks = [createHook('h1')];
            instance.setRunnables({ tests: [test] });
            instance.addLog(createCommand(1, '1', 'h1'));
            instance.updateLog({ id: 1, testId: '1', name: 'new name' });
            expect(instance.testById('1').lastAttempt.commands[0].name).to.equal('new name');
        });
    });
    context('#removeLog', () => {
        it('removes the log', () => {
            const test = createTest('1');
            test.hooks = [createHook('h1')];
            instance.setRunnables({ tests: [test] });
            instance.addLog(createCommand(1, '1', 'h1'));
            instance.addLog(createCommand(2, '1', 'h1'));
            expect(instance.testById('1').lastAttempt.commands.length).to.equal(2);
            instance.removeLog(createCommand(1, '1', 'h1'));
            expect(instance.testById('1').lastAttempt.commands.length).to.equal(1);
            expect(instance.testById('1').lastAttempt.commands[0].id).to.equal(2);
        });
    });
    context('#setRunningSpec', () => {
        it('sets the current runnable as the path passed', () => {
            instance.setRunnables({ tests: [createTest('1')] });
            instance.setRunningSpec('specPath');
            expect(instance.runningSpec).to.equal('specPath');
        });
        it('add the previous path to the spec history', () => {
            instance.setRunnables({ tests: [createTest('1')] });
            instance.setRunningSpec('previousSpecPath');
            instance.setRunningSpec('nextSpecPath');
            expect(instance.runningSpec).to.equal('nextSpecPath');
            expect(instance.runnablesHistory['previousSpecPath']).not.to.be.undefined;
        });
    });
    context('#reset', () => {
        it('resets flags to default values', () => {
            instance.setRunnables({ tests: [createTest('1')] });
            instance.attemptingShowSnapshot = true;
            instance.showingSnapshot = true;
            instance.reset();
            expect(instance.hasSingleTest).to.be.false;
            expect(instance.hasTests).to.be.false;
            expect(instance.isReady).to.be.false;
            expect(instance.attemptingShowSnapshot).to.be.false;
            expect(instance.showingSnapshot).to.be.false;
        });
        it('resets runnables', () => {
            instance.setRunnables({ tests: [createTest('1')] });
            instance.reset();
            expect(instance.runnables.length).to.equal(0);
        });
        it('resets tests', () => {
            instance.setRunnables({ tests: [createTest('1')] });
            instance.reset();
            expect(instance.testById('1')).to.be.undefined;
        });
        it('resets runnablesHistory', () => {
            instance.setRunnables({ tests: [createTest('1')] });
            instance.setRunningSpec('previous');
            instance.reset();
            expect(instance.runnablesHistory).to.be.empty;
        });
    });
});
