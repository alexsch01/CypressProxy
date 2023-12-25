"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServersActions = void 0;
const tslib_1 = require("tslib");
const util_1 = tslib_1.__importDefault(require("util"));
class ServersActions {
    constructor(ctx) {
        this.ctx = ctx;
    }
    setAppServerPort(port) {
        this.ctx.update((d) => {
            d.servers.appServerPort = port !== null && port !== void 0 ? port : null;
        });
    }
    setAppSocketServer({ socketIo, cdpIo } = { socketIo: undefined, cdpIo: undefined }) {
        this.ctx.update((d) => {
            var _a, _b, _c, _d;
            (_a = d.servers.appSocketServer) === null || _a === void 0 ? void 0 : _a.disconnectSockets(true);
            (_b = d.servers.appSocketNamespace) === null || _b === void 0 ? void 0 : _b.disconnectSockets(true);
            (_c = d.servers.cdpSocketServer) === null || _c === void 0 ? void 0 : _c.disconnectSockets(true);
            (_d = d.servers.cdpSocketNamespace) === null || _d === void 0 ? void 0 : _d.disconnectSockets(true);
            d.servers.appSocketServer = socketIo;
            d.servers.appSocketNamespace = socketIo === null || socketIo === void 0 ? void 0 : socketIo.of('/data-context');
            d.servers.cdpSocketServer = cdpIo;
            d.servers.cdpSocketNamespace = cdpIo === null || cdpIo === void 0 ? void 0 : cdpIo.of('/data-context');
        });
    }
    setGqlServer(srv) {
        this.ctx.update((d) => {
            d.servers.gqlServer = srv;
            d.servers.gqlServerPort = srv.address().port;
        });
    }
    setGqlSocketServer(socketServer) {
        this.ctx.update((d) => {
            var _a;
            (_a = d.servers.gqlSocketServer) === null || _a === void 0 ? void 0 : _a.disconnectSockets(true);
            d.servers.gqlSocketServer = socketServer;
        });
    }
    async destroyGqlServer() {
        var _a;
        const destroy = (_a = this.ctx.coreData.servers.gqlServer) === null || _a === void 0 ? void 0 : _a.destroy;
        if (!destroy) {
            return;
        }
        return util_1.default.promisify(destroy)();
    }
}
exports.ServersActions = ServersActions;
