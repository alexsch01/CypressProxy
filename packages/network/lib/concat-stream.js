"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.concatStream = void 0;
const tslib_1 = require("tslib");
const lodash_1 = tslib_1.__importDefault(require("lodash"));
const concat_stream_1 = tslib_1.__importDefault(require("concat-stream"));
/**
 * Wrapper for `concat-stream` to handle empty streams.
 */
const concatStream = function (opts, cb) {
    let _cb = cb;
    if (!_cb) {
        _cb = opts;
        opts = {};
    }
    return (0, concat_stream_1.default)(opts, function (buf) {
        if (!lodash_1.default.get(buf, 'length')) {
            // concat-stream can give an empty array if the stream has
            // no data - just call the callback with an empty buffer
            return _cb(Buffer.from(''));
        }
        return _cb(buf);
    });
};
exports.concatStream = concatStream;
