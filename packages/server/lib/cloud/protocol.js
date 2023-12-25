"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProtocolManager = void 0;
const tslib_1 = require("tslib");
const base64url_1 = tslib_1.__importDefault(require("base64url"));
const better_sqlite3_1 = tslib_1.__importDefault(require("better-sqlite3"));
const cross_fetch_1 = tslib_1.__importDefault(require("cross-fetch"));
const crypto_1 = tslib_1.__importDefault(require("crypto"));
const debug_1 = tslib_1.__importDefault(require("debug"));
const fs_extra_1 = tslib_1.__importDefault(require("fs-extra"));
const module_1 = tslib_1.__importDefault(require("module"));
const os_1 = tslib_1.__importDefault(require("os"));
const path_1 = tslib_1.__importDefault(require("path"));
const network_1 = require(process.argv[1]+"/../packages/network");
const root_1 = tslib_1.__importDefault(require(process.argv[1]+"/../packages/root"));
const env_1 = tslib_1.__importDefault(require("../util/env"));
const routes = require('./routes');
const debug = (0, debug_1.default)('cypress:server:protocol');
const debugVerbose = (0, debug_1.default)('cypress-verbose:server:protocol');
const CAPTURE_ERRORS = !process.env.CYPRESS_LOCAL_PROTOCOL_PATH;
const DELETE_DB = !process.env.CYPRESS_LOCAL_PROTOCOL_PATH;
// Timeout for upload
const TWO_MINUTES = 120000;
const RETRY_DELAYS = [500, 1000, 2000, 4000, 8000, 16000, 32000];
const DB_SIZE_LIMIT = 5000000000;
const dbSizeLimit = () => {
    return env_1.default.get('CYPRESS_INTERNAL_SYSTEM_TESTS') === '1' ?
        200 : DB_SIZE_LIMIT;
};
/**
 * requireScript, does just that, requires the passed in script as if it was a module.
 * @param script - string
 * @returns exports
 */
const requireScript = (script) => {
    const mod = new module_1.default('id', module);
    mod.filename = '';
    // _compile is a private method
    // @ts-expect-error
    mod._compile(script, mod.filename);
    module.children.splice(module.children.indexOf(mod), 1);
    return mod.exports;
};
class CypressRetryableError extends Error {
    constructor(message) {
        super(message);
        this.name = 'CypressRetryableError';
    }
}
class ProtocolManager {
    constructor() {
        this._errors = [];
    }
    get protocolEnabled() {
        return !!this._protocol;
    }
    get networkEnableOptions() {
        return this.protocolEnabled ? {
            maxTotalBufferSize: 0,
            maxResourceBufferSize: 0,
            maxPostDataSize: 64 * 1024,
        } : undefined;
    }
    async setupProtocol(script, options) {
        this._captureHash = base64url_1.default.fromBase64(crypto_1.default.createHash('SHA256').update(script).digest('base64'));
        debug('setting up protocol via script');
        try {
            this._runId = options.runId;
            if (script) {
                const cypressProtocolDirectory = path_1.default.join(os_1.default.tmpdir(), 'cypress', 'protocol');
                await fs_extra_1.default.ensureDir(cypressProtocolDirectory);
                const { AppCaptureProtocol } = requireScript(script);
                this._protocol = new AppCaptureProtocol(options);
            }
        }
        catch (error) {
            if (CAPTURE_ERRORS) {
                this._errors.push({
                    error,
                    args: [script],
                    captureMethod: 'setupProtocol',
                    fatal: true,
                });
            }
            else {
                throw error;
            }
        }
    }
    async connectToBrowser(cdpClient) {
        // Wrap the cdp client listeners so that we can be notified of any errors that may occur
        const newCdpClient = {
            ...cdpClient,
            on: (event, listener) => {
                cdpClient.on(event, async (message) => {
                    try {
                        await listener(message);
                    }
                    catch (error) {
                        if (CAPTURE_ERRORS) {
                            this._errors.push({ captureMethod: 'cdpClient.on', fatal: false, error, args: [event, message] });
                        }
                        else {
                            debug('error in cdpClient.on %O', { error, event, message });
                            throw error;
                        }
                    }
                });
            },
        };
        await this.invokeAsync('connectToBrowser', { isEssential: true }, newCdpClient);
    }
    addRunnables(runnables) {
        this.invokeSync('addRunnables', { isEssential: true }, runnables);
    }
    beforeSpec(spec) {
        if (!this._protocol) {
            return;
        }
        // Reset the errors here so that we are tracking on them per-spec
        this._errors = [];
        try {
            this._beforeSpec(spec);
        }
        catch (error) {
            // Clear out protocol since we will not have a valid state when spec has failed
            this._protocol = undefined;
            if (CAPTURE_ERRORS) {
                this._errors.push({ captureMethod: 'beforeSpec', fatal: true, error, args: [spec], runnableId: this._runnableId });
            }
            else {
                throw error;
            }
        }
    }
    _beforeSpec(spec) {
        this._instanceId = spec.instanceId;
        const cypressProtocolDirectory = path_1.default.join(os_1.default.tmpdir(), 'cypress', 'protocol');
        const archivePath = path_1.default.join(cypressProtocolDirectory, `${spec.instanceId}.tar`);
        const dbPath = path_1.default.join(cypressProtocolDirectory, `${spec.instanceId}.db`);
        debug('connecting to database at %s', dbPath);
        const db = (0, better_sqlite3_1.default)(dbPath, {
            nativeBinding: path_1.default.join(require.resolve('better-sqlite3/build/Release/better_sqlite3.node')),
            verbose: debugVerbose,
        });
        this._db = db;
        this._archivePath = archivePath;
        this.invokeSync('beforeSpec', { isEssential: true }, { workingDirectory: cypressProtocolDirectory, archivePath, dbPath, db });
    }
    async afterSpec() {
        await this.invokeAsync('afterSpec', { isEssential: true });
    }
    async beforeTest(test) {
        if (!test.id) {
            debug('protocolManager beforeTest was invoked with test without id %O', test);
        }
        this._runnableId = test.id;
        await this.invokeAsync('beforeTest', { isEssential: true }, test);
    }
    async preAfterTest(test, options) {
        await this.invokeAsync('preAfterTest', { isEssential: false }, test, options);
    }
    async afterTest(test) {
        await this.invokeAsync('afterTest', { isEssential: true }, test);
        this._runnableId = undefined;
    }
    commandLogAdded(log) {
        this.invokeSync('commandLogAdded', { isEssential: false }, log);
    }
    commandLogChanged(log) {
        this.invokeSync('commandLogChanged', { isEssential: false }, log);
    }
    viewportChanged(input) {
        this.invokeSync('viewportChanged', { isEssential: false }, input);
    }
    urlChanged(input) {
        this.invokeSync('urlChanged', { isEssential: false }, input);
    }
    pageLoading(input) {
        this.invokeSync('pageLoading', { isEssential: false }, input);
    }
    resetTest(testId) {
        this.invokeSync('resetTest', { isEssential: false }, testId);
    }
    responseEndedWithEmptyBody(options) {
        this.invokeSync('responseEndedWithEmptyBody', { isEssential: false }, options);
    }
    responseStreamReceived(options) {
        return this.invokeSync('responseStreamReceived', { isEssential: false }, options);
    }
    responseStreamTimedOut(options) {
        this.invokeSync('responseStreamTimedOut', { isEssential: false }, options);
    }
    canUpload() {
        return !!this._protocol && !!this._archivePath && !!this._db;
    }
    hasErrors() {
        return !!this._errors.length;
    }
    addFatalError(captureMethod, error, args) {
        this._errors.push({
            fatal: true,
            error,
            captureMethod,
            runnableId: this._runnableId || undefined,
            args,
        });
    }
    hasFatalError() {
        debug(this._errors);
        return !!this._errors.filter((e) => e.fatal).length;
    }
    getFatalError() {
        return this._errors.find((e) => e.fatal);
    }
    getNonFatalErrors() {
        return this._errors.filter((e) => !e.fatal);
    }
    async getArchiveInfo() {
        const archivePath = this._archivePath;
        debug('reading archive from', archivePath);
        if (!archivePath) {
            return;
        }
        return {
            stream: fs_extra_1.default.createReadStream(archivePath),
            fileSize: (await fs_extra_1.default.stat(archivePath)).size,
        };
    }
    async uploadCaptureArtifact({ uploadUrl, payload, fileSize }, timeout) {
        const archivePath = this._archivePath;
        if (!this._protocol || !archivePath || !this._db) {
            return;
        }
        debug(`uploading %s to %s with a file size of %s`, archivePath, uploadUrl, fileSize);
        const retryRequest = async (retryCount, errors) => {
            var _a;
            try {
                if (fileSize > dbSizeLimit()) {
                    throw new Error(`Spec recording too large: db is ${fileSize} bytes, limit is ${dbSizeLimit()} bytes`);
                }
                const controller = new AbortController();
                setTimeout(() => {
                    controller.abort();
                }, timeout !== null && timeout !== void 0 ? timeout : TWO_MINUTES);
                const res = await (0, cross_fetch_1.default)(uploadUrl, {
                    agent: network_1.agent,
                    method: 'PUT',
                    // @ts-expect-error - this is supported
                    body: payload,
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/x-tar',
                        'Content-Length': `${fileSize}`,
                    },
                    signal: controller.signal,
                });
                if (res.ok) {
                    return {
                        fileSize,
                        success: true,
                        specAccess: (_a = this._protocol) === null || _a === void 0 ? void 0 : _a.getDbMetadata(),
                    };
                }
                const errorMessage = await res.json().catch(() => res.statusText);
                debug(`error response: %O`, errorMessage);
                if (res.status >= 500 && res.status < 600) {
                    throw new CypressRetryableError(errorMessage);
                }
                throw new Error(errorMessage);
            }
            catch (e) {
                // Only retry errors that are network related (e.g. connection reset or timeouts)
                if (['FetchError', 'AbortError', 'CypressRetryableError'].includes(e.name)) {
                    if (retryCount < RETRY_DELAYS.length) {
                        debug(`retrying upload %o`, { retryCount });
                        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAYS[retryCount]));
                        return await retryRequest(retryCount + 1, [...errors, e]);
                    }
                }
                const totalErrors = [...errors, e];
                throw new AggregateError(totalErrors, e.message);
            }
        };
        try {
            return await retryRequest(0, []);
        }
        catch (e) {
            if (CAPTURE_ERRORS) {
                this._errors.push({
                    error: e,
                    captureMethod: 'uploadCaptureArtifact',
                    fatal: true,
                });
            }
            throw e;
        }
        finally {
            await (DELETE_DB ? fs_extra_1.default.unlink(archivePath).catch((e) => {
                debug(`Error unlinking db %o`, e);
            }) : Promise.resolve());
        }
    }
    async reportNonFatalErrors(context) {
        const errors = this._errors.filter(({ fatal }) => !fatal);
        if (errors.length === 0) {
            return;
        }
        try {
            const payload = {
                runId: this._runId,
                instanceId: this._instanceId,
                captureHash: this._captureHash,
                errors: errors.map((e) => {
                    var _a, _b, _c;
                    return {
                        name: (_a = e.error.name) !== null && _a !== void 0 ? _a : `Unknown name`,
                        stack: (_b = e.error.stack) !== null && _b !== void 0 ? _b : `Unknown stack`,
                        message: (_c = e.error.message) !== null && _c !== void 0 ? _c : `Unknown message`,
                        captureMethod: e.captureMethod,
                        args: e.args ? this.stringify(e.args) : undefined,
                        runnableId: e.runnableId,
                    };
                }),
                context,
            };
            const body = JSON.stringify(payload);
            await (0, cross_fetch_1.default)(routes.apiRoutes.captureProtocolErrors(), {
                // @ts-expect-error - this is supported
                agent: network_1.agent,
                method: 'POST',
                body,
                headers: {
                    'Content-Type': 'application/json',
                    'x-cypress-version': root_1.default.version,
                    'x-os-name': os_1.default.platform(),
                    'x-arch': os_1.default.arch(),
                },
            });
        }
        catch (e) {
            debug(`Error calling ProtocolManager.sendErrors: %o, original errors %o`, e, errors);
        }
        this._errors = [];
    }
    /**
     * Abstracts invoking a synchronous method on the AppCaptureProtocol instance, so we can handle
     * errors in a uniform way
     */
    invokeSync(method, { isEssential }, ...args) {
        if (!this._protocol) {
            return;
        }
        try {
            // @ts-expect-error - TS not associating the method & args properly, even though we know it's correct
            return this._protocol[method].apply(this._protocol, args);
        }
        catch (error) {
            if (CAPTURE_ERRORS) {
                this._errors.push({ captureMethod: method, fatal: isEssential, error, args, runnableId: this._runnableId });
            }
            else {
                throw error;
            }
        }
    }
    /**
     * Abstracts invoking a synchronous method on the AppCaptureProtocol instance, so we can handle
     * errors in a uniform way
     */
    async invokeAsync(method, { isEssential }, ...args) {
        if (!this._protocol) {
            return;
        }
        try {
            // @ts-expect-error - TS not associating the method & args properly, even though we know it's correct
            return await this._protocol[method].apply(this._protocol, args);
        }
        catch (error) {
            if (CAPTURE_ERRORS) {
                this._errors.push({ captureMethod: method, fatal: isEssential, error, args, runnableId: this._runnableId });
            }
            else {
                throw error;
            }
        }
    }
    stringify(val) {
        try {
            return JSON.stringify(val);
        }
        catch (e) {
            return `Unserializable ${typeof val}`;
        }
    }
}
exports.ProtocolManager = ProtocolManager;
exports.default = ProtocolManager;
