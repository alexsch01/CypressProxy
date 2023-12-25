"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const sinon_1 = tslib_1.__importDefault(require("sinon"));
const scroller_1 = tslib_1.__importDefault(require("../../../src/lib/scroller"));
const { _ } = Cypress;
const getContainer = (props) => {
    return _.extend({
        clientHeight: 400,
        scrollHeight: 900,
        scrollTop: 0,
        addEventListener: sinon_1.default.spy(),
    }, props);
};
const getElement = (props) => {
    return _.extend({
        clientHeight: 20,
        offsetTop: 150,
    }, props);
};
describe('scroller', () => {
    let clock;
    beforeEach(() => {
        clock = sinon_1.default.useFakeTimers();
    });
    beforeEach(() => {
        scroller_1.default.__reset();
    });
    it('throws an error if attempting to scroll an element before setting a container', () => {
        expect(() => {
            return scroller_1.default.scrollIntoView({});
        }).to.throw().and.satisfy((err) => {
            expect(err.message).to.match(/container must be set/);
            return true;
        });
    });
    it('does not scroll if near top and scrolling would result in negative scroll', () => {
        const container = getContainer();
        scroller_1.default.setContainer(container);
        scroller_1.default.scrollIntoView(getElement({ offsetTop: 0 }));
        expect(container.scrollTop).to.equal(0);
    });
    it('does not scroll if already full visible', () => {
        const container = getContainer();
        scroller_1.default.setContainer(container);
        scroller_1.default.scrollIntoView(getElement({ offsetTop: 80 }));
        expect(container.scrollTop).to.equal(0);
    });
    it('scrolls to the goal', () => {
        const container = getContainer({ scrollTop: 50 });
        scroller_1.default.setContainer(container);
        scroller_1.default.scrollIntoView(getElement({ offsetTop: 600 }));
        expect(container.scrollTop).to.equal(320);
    });
    context('#getScrollTop', () => {
        it('returns the current scrollTop for the container', () => {
            scroller_1.default.setContainer(getContainer({ scrollTop: 123 }));
            expect(scroller_1.default.getScrollTop()).to.equal(123);
        });
        it('returns 0 if the container is not set', () => {
            expect(scroller_1.default.getScrollTop()).to.equal(0);
        });
    });
    context('#setScrollTop', () => {
        it('sets the scrollTop on the container', () => {
            scroller_1.default.setContainer(getContainer({ scrollTop: 123 }));
            scroller_1.default.setScrollTop(456);
            expect(scroller_1.default.getScrollTop()).to.equal(456);
        });
        it('does nothing if container is not set', () => {
            scroller_1.default.setScrollTop(456);
            expect(scroller_1.default.getScrollTop()).to.equal(0);
        });
        it('does nothing if value is null', () => {
            scroller_1.default.setContainer(getContainer({ scrollTop: 123 }));
            scroller_1.default.setScrollTop(null);
            expect(scroller_1.default.getScrollTop()).to.equal(123);
        });
        it('does nothing if value is undefined', () => {
            scroller_1.default.setContainer(getContainer({ scrollTop: 123 }));
            scroller_1.default.setScrollTop();
            expect(scroller_1.default.getScrollTop()).to.equal(123);
        });
    });
    context('scrolling', () => {
        it('listens to scroll event on container', () => {
            const container = getContainer();
            scroller_1.default.setContainer(container);
            expect(container.addEventListener).to.have.been.calledWith('scroll');
        });
        it('calls onUserScroll callback if 3 or more user scroll events are detected within 50ms', () => {
            const container = getContainer();
            const onUserScroll = sinon_1.default.spy();
            scroller_1.default.setContainer(container, onUserScroll);
            container.addEventListener.callArg(1);
            clock.tick(15);
            container.addEventListener.callArg(1);
            clock.tick(15);
            container.addEventListener.callArg(1);
            expect(onUserScroll).to.have.been.called;
        });
        it('does nothing if 50ms passes before 3 user scroll events', () => {
            const container = getContainer();
            const onUserScroll = sinon_1.default.spy();
            scroller_1.default.setContainer(container, onUserScroll);
            container.addEventListener.callArg(1);
            container.addEventListener.callArg(1);
            clock.tick(50);
            container.addEventListener.callArg(1);
            expect(onUserScroll).not.to.have.been.called;
        });
        it('does nothing for programmatic scroll events', () => {
            const container = getContainer();
            const onUserScroll = sinon_1.default.spy();
            scroller_1.default.setContainer(container, onUserScroll);
            scroller_1.default.scrollIntoView(getElement({ offsetTop: 600 }));
            clock.tick(16);
            container.addEventListener.callArg(1);
            clock.tick(16);
            container.addEventListener.callArg(1);
            clock.tick(16);
            container.addEventListener.callArg(1);
            expect(onUserScroll).not.to.have.been.called;
        });
    });
});
