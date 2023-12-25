"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createWebsocket = exports.client = void 0;
const tslib_1 = require("tslib");
const socket_io_client_1 = tslib_1.__importDefault(require("socket.io-client"));
const cdp_browser_1 = require("./cdp-browser");
let chromium = false;
function client(uri, opts) {
    if (chromium) {
        const fullNamespace = `${opts === null || opts === void 0 ? void 0 : opts.path}${uri}`;
        // When running in Chromium and with a baseUrl set to something that includes basic auth: (e.g. http://user:pass@localhost:1234), the assets
        // will load twice. Thus, we need to add the cypress sockets to the window object rather than just relying on a local variable.
        window.cypressSockets || (window.cypressSockets = {});
        if (!window.cypressSockets[fullNamespace]) {
            window.cypressSockets[fullNamespace] = new cdp_browser_1.CDPBrowserSocket(fullNamespace);
        }
        // Connect the socket regardless of whether or not we have newly created it
        window.cypressSockets[fullNamespace].connect();
        return window.cypressSockets[fullNamespace];
    }
    return (0, socket_io_client_1.default)(uri, opts);
}
exports.client = client;
function createWebsocket({ path, browserFamily }) {
    if (browserFamily === 'chromium') {
        chromium = true;
        const fullNamespace = `${path}/default`;
        // When running in Chromium and with a baseUrl set to something that includes basic auth: (e.g. http://user:pass@localhost:1234), the assets
        // will load twice. Thus, we need to add the cypress sockets to the window object rather than just relying on a local variable.
        window.cypressSockets || (window.cypressSockets = {});
        if (!window.cypressSockets[fullNamespace]) {
            window.cypressSockets[fullNamespace] = new cdp_browser_1.CDPBrowserSocket(fullNamespace);
        }
        // Connect the socket regardless of whether or not we have newly created it
        window.cypressSockets[fullNamespace].connect();
        return window.cypressSockets[fullNamespace];
    }
    return (0, socket_io_client_1.default)({
        path,
        // TODO(webkit): the websocket socket.io transport is busted in WebKit, need polling
        // https://github.com/cypress-io/cypress/issues/23807
        transports: browserFamily === 'webkit' ? ['polling'] : ['websocket'],
    });
}
exports.createWebsocket = createWebsocket;
