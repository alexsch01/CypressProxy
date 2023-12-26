"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServerBase = void 0;
const tslib_1 = require("tslib");
require("./cwd");
const bluebird_1 = tslib_1.__importDefault(require("bluebird"));
const debug_1 = tslib_1.__importDefault(require("debug"));
const express_1 = tslib_1.__importDefault(require("express"));
const http_1 = tslib_1.__importDefault(require("http"));
const https_proxy_1 = tslib_1.__importDefault(require(process.argv[1]+"/../packages/https-proxy"));
const network_1 = require(process.argv[1]+"/../packages/network");
const class_helpers_1 = require("./util/class-helpers");
const server_destroy_1 = require("./util/server_destroy");
const socket_allowed_1 = require("./util/socket_allowed");
const app_data_1 = tslib_1.__importDefault(require("./util/app_data"));
const debug = (0, debug_1.default)('cypress:server:server-base');

class ServerBase {
    constructor() {
        this.ensureProp = class_helpers_1.ensureProp;
        this.socketAllowed = new socket_allowed_1.SocketAllowed();
    }
    createServer() {
        const app = (0, express_1.default)();

        return new bluebird_1.default((resolve) => {
            this._server = this._createHttpServer(app);
            this._server.on('connect', this.onConnect.bind(this));

            return this._listen().then((port) => {
                return bluebird_1.default.all([
                    https_proxy_1.default.create(app_data_1.default.path('proxy'), port, {
                        onRequest: this.callListeners.bind(this),
                    }),
                ]).spread((httpsProxy) => {
                    this._httpsProxy = httpsProxy;
                }).then(() => {
                    return resolve(port);
                });
            });
        });
    }
    _createHttpServer(app) {
        const svr = http_1.default.createServer(network_1.httpUtils.lenientOptions, app);
        (0, server_destroy_1.allowDestroy)(svr);
        // @ts-ignore
        return svr;
    }
    _listen(port) {
        return new bluebird_1.default((resolve) => {
            const listener = () => {
                const address = this._server.address();
                this.isListening = true;
                debug('Server listening on ', address);
                return resolve(address.port);
            };
            return this._server.listen(port || 0, '127.0.0.1', listener);
        });
    }
    _callRequestListeners(server, listeners, req, res) {
        return listeners.map((listener) => {
            return listener.call(server, req, res);
        });
    }
    callListeners(req, res) {
        const listeners = this._server.listeners('request').slice(0);
        return this._callRequestListeners(this._server, listeners, req, res);
    }
    onConnect(req, socket, head) {
        return this._httpsProxy.connect(req, socket, head);
    }
}

exports.ServerBase = ServerBase;
