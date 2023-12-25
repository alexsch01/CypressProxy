"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.launch = exports.debug = void 0;
const tslib_1 = require("tslib");
const debug_1 = tslib_1.__importDefault(require("debug"));
const utils_1 = require("./utils");
exports.debug = (0, debug_1.default)('cypress:launcher:browsers');
function launch(browser, url, debuggingPort, args = [], browserEnv = {}) {
    (0, exports.debug)('launching browser %o', { browser, url });
    if (!browser.path) {
        throw new Error(`Browser ${browser.name} is missing path`);
    }
    if (url) {
        args = [url].concat(args);
    }
    const spawnOpts = {
        stdio: ['ignore', 'pipe', 'pipe'],
        // allow setting default env vars such as MOZ_HEADLESS_WIDTH
        // but only if it's not already set by the environment
        env: { ...browserEnv, ...process.env },
    };
    (0, exports.debug)('spawning browser with opts %o', { browser, url, spawnOpts });
    const proc = utils_1.utils.spawnWithArch(browser.path, args, spawnOpts);
    proc.stdout.on('data', (buf) => {
        (0, exports.debug)('%s stdout: %s', browser.name, String(buf).trim());
    });
    proc.stderr.on('data', (buf) => {
        (0, exports.debug)('%s stderr: %s', browser.name, String(buf).trim());
    });
    proc.on('exit', (code, signal) => {
        (0, exports.debug)('%s exited: %o', browser.name, { code, signal });
    });
    return proc;
}
exports.launch = launch;
