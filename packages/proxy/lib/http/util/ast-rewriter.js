"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stripStream = exports.strip = void 0;
const tslib_1 = require("tslib");
const rewriter_1 = require(process.argv[1]+"/../packages/rewriter");
const duplexify_1 = tslib_1.__importDefault(require("duplexify"));
const network_1 = require(process.argv[1]+"/../packages/network");
const stream_1 = tslib_1.__importDefault(require("stream"));
const pumpify = require('pumpify');
const utf8Stream = require('utf8-stream');
const strip = async (source, opts) => {
    if (opts.isNotJavascript) {
        return (0, rewriter_1.rewriteHtmlJsAsync)(opts.url, source, opts.deferSourceMapRewrite); // threaded
    }
    return (0, rewriter_1.rewriteJsAsync)(opts.url, source, opts.deferSourceMapRewrite); // threaded
};
exports.strip = strip;
const stripStream = (opts) => {
    if (opts.isNotJavascript) {
        return pumpify(utf8Stream(), (0, rewriter_1.HtmlJsRewriter)(opts.url, opts.deferSourceMapRewrite));
    }
    const pt = new (stream_1.default.PassThrough)();
    return (0, duplexify_1.default)(pumpify(utf8Stream(), (0, network_1.concatStream)(async (body) => {
        pt.write(await (0, exports.strip)(body.toString(), opts));
        pt.end();
    })), pt);
};
exports.stripStream = stripStream;
