"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getClientVersion = exports.getPathToClientSource = exports.SocketIOServer = exports.server = exports.ServerOptions = void 0;
const tslib_1 = require("tslib");
const buffer_1 = tslib_1.__importDefault(require("buffer"));
const socket_io_1 = tslib_1.__importStar(require("socket.io"));
exports.server = socket_io_1.default;
Object.defineProperty(exports, "ServerOptions", { enumerable: true, get: function () { return socket_io_1.ServerOptions; } });
const { version } = require('socket.io-client/package.json');
const clientSource = require.resolve('socket.io-client/dist/socket.io.js');
class SocketIOServer extends socket_io_1.Server {
    constructor(srv, opts) {
        var _a;
        opts = opts !== null && opts !== void 0 ? opts : {};
        // the maxHttpBufferSize is used to limit the message size sent over
        // the socket. Small values can be used to mitigate exposure to
        // denial of service attacks; the default as of v3.0 is 1MB.
        // because our server is local, we do not need to arbitrarily limit
        // the message size and can use the theoretical maximum value.
        opts.maxHttpBufferSize = (_a = opts.maxHttpBufferSize) !== null && _a !== void 0 ? _a : buffer_1.default.constants.MAX_LENGTH;
        super(srv, opts);
    }
}
exports.SocketIOServer = SocketIOServer;
// TODO: I don't know that this is used anywhere?
const getPathToClientSource = () => {
    return clientSource;
};
exports.getPathToClientSource = getPathToClientSource;
const getClientVersion = () => {
    return version;
};
exports.getClientVersion = getClientVersion;
