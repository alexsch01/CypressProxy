"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.decode = exports.encode = void 0;
const tslib_1 = require("tslib");
const socketIoParser = tslib_1.__importStar(require("socket.io-parser"));
// @ts-ignore
const engineParser = tslib_1.__importStar(require("engine.io-parser"));
const encode = (data, namespace) => {
    return new Promise((resolve, reject) => {
        try {
            const encoder = new socketIoParser.Encoder();
            const socketIoEncodedData = encoder.encode({
                type: socketIoParser.PacketType.EVENT,
                data,
                nsp: namespace,
            });
            engineParser.encodePayload(socketIoEncodedData.map((item) => {
                return {
                    type: 'message',
                    data: item,
                };
            }), (encoded) => {
                resolve(encoded);
            });
        }
        catch (err) {
            reject(err);
        }
    });
};
exports.encode = encode;
const decode = (data) => {
    return new Promise((resolve, reject) => {
        try {
            const decoded = engineParser.decodePayload(data);
            const decoder = new socketIoParser.Decoder();
            decoder.on('decoded', (packet) => {
                decoder.destroy();
                resolve(packet.data);
            });
            decoded.forEach((packet) => {
                decoder.add(packet.data);
            });
        }
        catch (error) {
            reject(error);
        }
    });
};
exports.decode = decode;
