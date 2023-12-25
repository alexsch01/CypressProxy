"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CDPSocket = exports.CDPSocketServer = void 0;
const tslib_1 = require("tslib");
const stream_1 = require("stream");
const crypto_1 = require("crypto");
const utils_1 = require("./utils");
const debug_1 = tslib_1.__importDefault(require("debug"));
const debugVerbose = (0, debug_1.default)('cypress-verbose:server:socket:cdp-socket');
/**
 * The goal of this class is to emulate the socket io server API, but using the Chrome DevTools Protocol.
 */
class CDPSocketServer extends stream_1.EventEmitter {
    constructor({ path = '', namespace = '/default' } = {}) {
        super();
        this._namespaceMap = {};
        this.emit = (event, ...args) => {
            var _a;
            (_a = this._cdpSocket) === null || _a === void 0 ? void 0 : _a.emit(event, ...args);
            return true;
        };
        this._path = path;
        this._fullNamespace = `${path}${namespace}`;
    }
    async attachCDPClient(cdpClient) {
        this._cdpSocket = await CDPSocket.init(cdpClient, this._fullNamespace);
        await Promise.all(Object.values(this._namespaceMap).map(async (server) => {
            return server.attachCDPClient(cdpClient);
        }));
        // Simulate a connection event
        super.emit('connection', this._cdpSocket);
    }
    of(namespace) {
        const fullNamespace = `${this._path}${namespace}`;
        let server = this._namespaceMap[fullNamespace];
        if (!server) {
            server = new CDPSocketServer({ path: this._path, namespace });
            this._namespaceMap[fullNamespace] = server;
        }
        return server;
    }
    // We want to match the socket io API, but we don't really need to support rooms, so we are just passing along the existing server in this case.
    to() {
        return this;
    }
    close() {
        var _a;
        (_a = this._cdpSocket) === null || _a === void 0 ? void 0 : _a.close();
        this.removeAllListeners();
        this._cdpSocket = undefined;
        Object.values(this._namespaceMap).forEach((server) => {
            server.close();
        });
    }
    disconnectSockets(close) {
        this.close();
    }
}
exports.CDPSocketServer = CDPSocketServer;
class CDPSocket extends stream_1.EventEmitter {
    constructor(cdpClient, namespace) {
        super();
        this.join = () => {
            return;
        };
        this.emit = (event, ...args) => {
            // Generate a unique callback event name
            const uuid = (0, crypto_1.randomUUID)();
            let callback;
            if (typeof args[args.length - 1] === 'function') {
                callback = args.pop();
            }
            if (callback) {
                this.once(uuid, callback);
            }
            (0, utils_1.encode)([event, uuid, args], this._namespace).then((encoded) => {
                var _a;
                const expression = `
        if (window['cypressSocket-${this._namespace}'] && window['cypressSocket-${this._namespace}'].send) {
          window['cypressSocket-${this._namespace}'].send('${JSON.stringify(encoded).replaceAll('\\', '\\\\').replaceAll('\'', '\\\'')}')
        }
      `;
                debugVerbose('sending message to browser %o', { expression });
                (_a = this._cdpClient) === null || _a === void 0 ? void 0 : _a.send('Runtime.evaluate', { expression, contextId: this._executionContextId }).then((result) => {
                    debugVerbose('successfully sent message to browser %o', result);
                }).catch((error) => {
                    debugVerbose('error sending message to browser %o', { error });
                });
            });
            return true;
        };
        this.disconnect = () => {
            this.close();
        };
        this.close = () => {
            var _a;
            (_a = this._cdpClient) === null || _a === void 0 ? void 0 : _a.off('Runtime.bindingCalled', this.processCDPRuntimeBinding);
            this._cdpClient = undefined;
        };
        this.processCDPRuntimeBinding = async (bindingCalledEvent) => {
            const { name, payload } = bindingCalledEvent;
            if (name !== `cypressSendToServer-${this._namespace}`) {
                return;
            }
            debugVerbose('received message from browser %o', { payload });
            this._executionContextId = bindingCalledEvent.executionContextId;
            const data = JSON.parse(payload);
            (0, utils_1.decode)(data).then((decoded) => {
                const [event, callbackEvent, args] = decoded;
                const callback = (...callbackArgs) => {
                    debugVerbose('emitting callback from browser %o', { callbackEvent, callbackArgs });
                    this.emit(callbackEvent, ...callbackArgs);
                };
                debugVerbose('emitting message from browser %o', { event, callbackEvent, args });
                super.emit(event, ...args, callback);
            });
        };
        this._cdpClient = cdpClient;
        this._namespace = namespace;
        this._cdpClient.on('Runtime.bindingCalled', this.processCDPRuntimeBinding);
    }
    static async init(cdpClient, namespace) {
        await cdpClient.send('Runtime.enable');
        await cdpClient.send('Runtime.addBinding', {
            name: `cypressSendToServer-${namespace}`,
        });
        return new CDPSocket(cdpClient, namespace);
    }
    get connected() {
        return !!this._cdpClient;
    }
}
exports.CDPSocket = CDPSocket;
