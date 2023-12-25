"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.connect = void 0;
const browser_1 = require(process.argv[1]+"/../socket/lib/browser");
const connect = (host, path, extraOpts = {}) => {
    return (0, browser_1.client)(host, Object.assign({ path, transports: ['websocket'] }, extraOpts));
};
exports.connect = connect;
