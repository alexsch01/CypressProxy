"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const sinon_1 = tslib_1.__importDefault(require("sinon"));
const hook_model_1 = tslib_1.__importDefault(require("../../../src/hooks/hook-model"));
describe('Hook model', () => {
    let hook;
    beforeEach(() => {
        hook = new hook_model_1.default({
            hookId: 'h1',
            hookName: 'before each',
        });
    });
    context('#addCommand', () => {
        it('adds the command to its command collection', () => {
            const command1 = { isMatchingEvent: () => {
                    return false;
                } };
            hook.addCommand(command1);
            expect(hook.commands.length).to.equal(1);
            const command2 = {};
            hook.addCommand(command2);
            expect(hook.commands.length).to.equal(2);
        });
        it('numbers commands incrementally when not events', () => {
            const command1 = { event: false, isMatchingEvent: () => {
                    return false;
                } };
            hook.addCommand(command1);
            expect(command1.number).to.equal(1);
            const command2 = { event: false };
            hook.addCommand(command2);
            expect(command2.number).to.equal(2);
        });
        it('does not number event commands', () => {
            const command1 = { event: false, isMatchingEvent: () => {
                    return false;
                } };
            hook.addCommand(command1);
            expect(command1.number).to.equal(1);
            const command2 = { event: true, isMatchingEvent: () => {
                    return false;
                } };
            hook.addCommand(command2);
            expect(command2.number).to.be.undefined;
            const command3 = { event: false };
            hook.addCommand(command3);
            expect(command3.number).to.equal(2);
        });
        it('does not number studio commands', () => {
            hook.isStudio = true;
            const command1 = { event: false, isMatchingEvent: () => {
                    return false;
                } };
            hook.addCommand(command1);
            expect(command1.number).to.be.undefined;
            const command2 = { event: false, number: 3, isMatchingEvent: () => {
                    return false;
                } };
            hook.addCommand(command2);
            expect(command2.number).to.equal(3);
        });
        it('only numbers studio visit commands', () => {
            hook.isStudio = true;
            const command1 = { event: false, name: 'visit', isMatchingEvent: () => {
                    return false;
                } };
            hook.addCommand(command1);
            expect(command1.number).to.equal(1);
            const command2 = { event: false, isMatchingEvent: () => {
                    return false;
                } };
            hook.addCommand(command2);
            expect(command2.number).to.be.undefined;
        });
        it('adds command as duplicate if it matches the last command', () => {
            const addChild = sinon_1.default.spy();
            const command1 = { event: true, isMatchingEvent: () => {
                    return true;
                }, addChild };
            hook.addCommand(command1);
            const command2 = { event: true };
            hook.addCommand(command2);
            expect(addChild).to.be.calledWith(command2);
        });
    });
    context('#commandMatchingErr', () => {
        it('returns last command to match the error', () => {
            const matchesButIsntLast = {
                // @ts-ignore
                err: { message: 'matching error message' },
                isMatchingEvent: () => {
                    return false;
                },
            };
            hook.addCommand(matchesButIsntLast);
            const doesntMatch = {
                // @ts-ignore
                err: { message: 'other error message' },
                isMatchingEvent: () => {
                    return false;
                },
            };
            hook.addCommand(doesntMatch);
            const matches = {
                err: { message: 'matching error message' },
            };
            hook.addCommand(matches);
            expect(hook.commandMatchingErr({ message: 'matching error message' })).to.eql(matches);
        });
        it('returns undefined when no match', () => {
            const noMatch1 = {
                // @ts-ignore
                err: { message: 'some error message' },
                isMatchingEvent: () => {
                    return false;
                },
            };
            hook.addCommand(noMatch1);
            const noMatch2 = {
                // @ts-ignore
                err: { message: 'other error message' },
            };
            hook.addCommand(noMatch2);
            expect(hook.commandMatchingErr({ message: 'matching error message' })).to.be.undefined;
        });
    });
    context('#aliasesWithDuplicates', () => {
        const addCommand = (alias, hasChildren = false) => {
            const command = {
                isMatchingEvent: () => {
                    return false;
                },
                alias,
                hasChildren,
            };
            return hook.addCommand(command);
        };
        it('returns duplicates marked with hasDuplicates and those that appear multiple times in the commands array', () => {
            addCommand('foo');
            addCommand('bar');
            addCommand('foo');
            addCommand('baz', true);
            expect(hook.aliasesWithDuplicates).to.include('foo');
            expect(hook.aliasesWithDuplicates).to.include('baz');
            expect(hook.aliasesWithDuplicates).to.not.include('bar');
        });
        // https://github.com/cypress-io/cypress/issues/4411
        it('returns the same array instance if it has not changed', () => {
            let dupes = hook.aliasesWithDuplicates;
            addCommand('foo');
            expect(dupes).to.deep.eq([]);
            addCommand('bar');
            expect(hook.aliasesWithDuplicates === dupes).to.be.true;
            addCommand('foo');
            dupes = hook.aliasesWithDuplicates;
            expect(dupes).to.deep.eq(['foo']);
            addCommand('foo');
            expect(hook.aliasesWithDuplicates === dupes).to.be.true;
        });
    });
    context('#removeCommand', () => {
        it('removes commands by ids', () => {
            const command1 = { id: 1, isMatchingEvent: () => {
                    return false;
                } };
            hook.addCommand(command1);
            const command2 = { id: 2, isMatchingEvent: () => {
                    return false;
                } };
            hook.addCommand(command2);
            expect(hook.commands.length).to.equal(2);
            hook.removeCommand(1);
            expect(hook.commands.length).to.equal(1);
            expect(hook.commands[0].id).to.equal(2);
        });
    });
});
