"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
// @ts-ignore
const dom_1 = tslib_1.__importDefault(require(process.argv[1]+"/../driver/src/dom"));
const events_1 = tslib_1.__importDefault(require("./events"));
const app_state_1 = tslib_1.__importDefault(require("./app-state"));
const mobx_1 = require("mobx");
class Shortcuts {
    start() {
        document.addEventListener('keydown', this._handleKeyDownEvent);
    }
    stop() {
        document.removeEventListener('keydown', this._handleKeyDownEvent);
    }
    _handleKeyDownEvent(event) {
        // if typing into an input, textarea, etc, don't trigger any shortcuts
        // @ts-ignore
        const isTextLike = dom_1.default.isTextLike(event.target);
        const isAnyModifierKeyPressed = event.altKey || event.ctrlKey || event.shiftKey || event.metaKey;
        if (isAnyModifierKeyPressed || isTextLike)
            return;
        switch (event.key) {
            case 'r':
                !app_state_1.default.studioActive && events_1.default.emit('restart');
                break;
            case 's':
                !app_state_1.default.isPaused && !app_state_1.default.studioActive && events_1.default.emit('stop');
                break;
            case 'f':
                (0, mobx_1.action)('toggle:spec:list', () => {
                    app_state_1.default.toggleSpecList();
                    events_1.default.emit('save:state');
                })();
                break;
            case 'c':
                events_1.default.emit('resume');
                break;
            case 'n':
                events_1.default.emit('next');
                break;
            case 'a':
                (0, mobx_1.action)('set:scrolling', () => {
                    app_state_1.default.toggleAutoScrollingUserPref();
                    events_1.default.emit('save:state');
                })();
                break;
            default: return;
        }
    }
}
exports.default = new Shortcuts();
