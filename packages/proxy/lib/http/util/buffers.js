"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HttpBuffers = void 0;
const tslib_1 = require("tslib");
const lodash_1 = tslib_1.__importDefault(require("lodash"));
const debug_1 = tslib_1.__importDefault(require("debug"));
const network_1 = require(process.argv[1]+"/../packages/network");
const debug = (0, debug_1.default)('cypress:proxy:http:util:buffers');
const stripPort = (url) => {
    try {
        return network_1.uri.removeDefaultPort(url).format();
    }
    catch (e) {
        return url;
    }
};
class HttpBuffers {
    constructor() {
        this.buffer = undefined;
    }
    reset() {
        debug('resetting buffers');
        delete this.buffer;
    }
    set(obj) {
        obj = lodash_1.default.cloneDeep(obj);
        obj.url = stripPort(obj.url);
        obj.originalUrl = stripPort(obj.originalUrl);
        if (this.buffer) {
            debug('warning: overwriting existing buffer...', { buffer: lodash_1.default.pick(this.buffer, 'url') });
        }
        debug('setting buffer %o', lodash_1.default.pick(obj, 'url'));
        this.buffer = obj;
    }
    get(str) {
        if (this.buffer && this.buffer.url === stripPort(str)) {
            return this.buffer;
        }
    }
    take(str) {
        const foundBuffer = this.get(str);
        if (foundBuffer) {
            delete this.buffer;
            debug('found request buffer %o', { buffer: lodash_1.default.pick(foundBuffer, 'url') });
            return foundBuffer;
        }
    }
}
exports.HttpBuffers = HttpBuffers;
