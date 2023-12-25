"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NetworkProxy = void 0;
const telemetry_1 = require(process.argv[1]+"/../packages/telemetry");
const http_1 = require("./http");
class NetworkProxy {
    constructor(opts) {
        this.http = new http_1.Http(opts);
    }
    addPendingBrowserPreRequest(preRequest) {
        this.http.addPendingBrowserPreRequest(preRequest);
    }
    removePendingBrowserPreRequest(requestId) {
        this.http.removePendingBrowserPreRequest(requestId);
    }
    addPendingUrlWithoutPreRequest(url) {
        this.http.addPendingUrlWithoutPreRequest(url);
    }
    handleHttpRequest(req, res) {
        const span = telemetry_1.telemetry.startSpan({
            name: 'network:proxy:handleHttpRequest',
            opts: {
                attributes: {
                    'network:proxy:url': req.proxiedUrl,
                    'network:proxy:contentType': req.get('content-type'),
                },
            },
            isVerbose: true,
        });
        this.http.handleHttpRequest(req, res, span).finally(() => {
            span === null || span === void 0 ? void 0 : span.end();
        });
    }
    handleSourceMapRequest(req, res) {
        this.http.handleSourceMapRequest(req, res);
    }
    setHttpBuffer(buffer) {
        this.http.setBuffer(buffer);
    }
    reset() {
        this.http.reset();
    }
    setProtocolManager(protocolManager) {
        this.http.setProtocolManager(protocolManager);
    }
    setPreRequestTimeout(timeout) {
        this.http.setPreRequestTimeout(timeout);
    }
}
exports.NetworkProxy = NetworkProxy;
