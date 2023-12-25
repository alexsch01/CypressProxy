"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const sinon_1 = tslib_1.__importDefault(require("sinon"));
const command_model_1 = tslib_1.__importDefault(require("../../../src/commands/command-model"));
const LONG_RUNNING_THRESHOLD = 1000;
const commandProps = (props) => {
    return Object.assign({
        renderProps: {},
        err: {},
        event: false,
        number: 1,
        numElements: 1,
        state: 'pending',
        visible: true,
    }, props);
};
describe('Command model', () => {
    let clock;
    beforeEach(() => {
        clock = sinon_1.default.useFakeTimers();
    });
    afterEach(() => {
        clock.restore();
    });
    context('.visible', () => {
        let command;
        it('sets visible to true for command has visible elements associated to it', () => {
            command = new command_model_1.default(commandProps({ visible: true }));
            expect(command.visible).to.be.true;
        });
        it('sets visible to false for command has hidden elements associated to it', () => {
            command = new command_model_1.default(commandProps({ visible: false }));
            expect(command.visible).to.be.false;
        });
        it('sets visible to true for command that does not associate with visibility', () => {
            command = new command_model_1.default(commandProps({ visible: undefined }));
            expect(command.visible).to.be.true;
        });
    });
    context('.numChildren', () => {
        context('event log', () => {
            it('with no children', () => {
                const command = new command_model_1.default(commandProps({ event: true }));
                expect(command.numChildren).to.eq(1);
            });
            it('with children', () => {
                const command = new command_model_1.default(commandProps({ event: true }));
                command.addChild(new command_model_1.default(commandProps()));
                expect(command.numChildren).to.eq(2);
                command.addChild(new command_model_1.default(commandProps()));
                expect(command.numChildren).to.eq(3);
            });
        });
        context('command log', () => {
            it('with no children', () => {
                const command = new command_model_1.default(commandProps({}));
                expect(command.numChildren).to.eq(0);
            });
            it('with children', () => {
                const command = new command_model_1.default(commandProps({}));
                command.addChild(new command_model_1.default(commandProps()));
                expect(command.numChildren).to.eq(1);
                command.addChild(new command_model_1.default(commandProps()));
                expect(command.numChildren).to.eq(2);
            });
            it('with children that are a command group', () => {
                const command = new command_model_1.default(commandProps({}));
                command.addChild(new command_model_1.default(commandProps()));
                const commandGroup = new command_model_1.default(commandProps());
                commandGroup.addChild(new command_model_1.default(commandProps()));
                commandGroup.addChild(new command_model_1.default(commandProps()));
                command.addChild(commandGroup);
                expect(command.numChildren).to.eq(4);
            });
        });
    });
    context('.hasChildren', () => {
        context('event log', () => {
            it('with no children', () => {
                const command = new command_model_1.default(commandProps({ event: true }));
                expect(command.hasChildren).to.be.false;
            });
            it('with one or more children', () => {
                const command = new command_model_1.default(commandProps({ event: true }));
                command.addChild(new command_model_1.default(commandProps()));
                expect(command.hasChildren).to.be.true;
            });
        });
        context('command log', () => {
            it('with no children', () => {
                const command = new command_model_1.default(commandProps({}));
                expect(command.hasChildren).to.be.false;
            });
            it('with one or more children', () => {
                const command = new command_model_1.default(commandProps({}));
                command.addChild(new command_model_1.default(commandProps()));
                expect(command.hasChildren).to.be.true;
            });
        });
    });
    context('.isLongRunning', () => {
        describe('when model is pending on initialization and LONG_RUNNING_THRESHOLD passes', () => {
            let command;
            beforeEach(() => {
                command = new command_model_1.default(commandProps());
            });
            it('sets isLongRunning to true if model is still pending', () => {
                clock.tick(LONG_RUNNING_THRESHOLD);
                expect(command.isLongRunning).to.be.true;
            });
            it('does not set isLongRunning to true if model is no longer pending', () => {
                command.state = 'passed';
                clock.tick(LONG_RUNNING_THRESHOLD);
                expect(command.isLongRunning).to.be.false;
            });
        });
        describe('when model is not pending on initialization, is updated to pending, and LONG_RUNNING_THRESHOLD passes', () => {
            let command;
            beforeEach(() => {
                command = new command_model_1.default(commandProps({ state: null }));
                clock.tick(300);
                command.update({ state: 'pending' });
            });
            it('sets isLongRunning to true if model is still pending', () => {
                clock.tick(LONG_RUNNING_THRESHOLD);
                expect(command.isLongRunning).to.be.true;
            });
            it('does not set isLongRunning to true if model is no longer pending', () => {
                command.state = 'passed';
                clock.tick(LONG_RUNNING_THRESHOLD);
                expect(command.isLongRunning).to.be.false;
            });
        });
    });
});
