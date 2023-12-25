"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CDPBrowserSocket = void 0;
const tslib_1 = require("tslib");
/// <reference lib="dom" />
const component_emitter_1 = tslib_1.__importDefault(require("component-emitter"));
const uuid_1 = require("uuid");
const utils_1 = require("./utils");
class CDPBrowserSocket extends component_emitter_1.default {
    constructor(namespace) {
        super();
        this.emit = (event, ...args) => {
            // Generate a unique key for this event
            const uuid = (0, uuid_1.v4)();
            let callback;
            if (typeof args[args.length - 1] === 'function') {
                callback = args.pop();
            }
            if (callback) {
                this.once(uuid, callback);
            }
            (0, utils_1.encode)([event, uuid, args], this._namespace).then((encoded) => {
                window[`cypressSendToServer-${this._namespace}`](JSON.stringify(encoded));
            });
            return this;
        };
        this._namespace = namespace;
        const send = (payload) => {
            const parsed = JSON.parse(payload);
            (0, utils_1.decode)(parsed).then((decoded) => {
                const [event, callbackEvent, args] = decoded;
                super.emit(event, ...args);
                this.emit(callbackEvent);
            });
        };
        let cypressSocket = window[`cypressSocket-${this._namespace}`];
        if (!cypressSocket) {
            cypressSocket = {};
            window[`cypressSocket-${this._namespace}`] = cypressSocket;
        }
        if (!cypressSocket.send) {
            cypressSocket.send = send;
        }
    }
    connect() {
        // Set timeout so that the connect event is emitted after the constructor returns and the user has a chance to attach a listener
        setTimeout(() => {
            super.emit('connect');
        }, 0);
    }
}
exports.CDPBrowserSocket = CDPBrowserSocket;
