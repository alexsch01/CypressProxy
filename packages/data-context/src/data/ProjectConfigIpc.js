"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectConfigIpc = void 0;
const tslib_1 = require("tslib");
/* eslint-disable no-dupe-class-members */
const errors_1 = require(process.argv[1]+"/../packages/errors");
const child_process_1 = require("child_process");
const events_1 = tslib_1.__importDefault(require("events"));
const fs_extra_1 = tslib_1.__importDefault(require("fs-extra"));
const path_1 = tslib_1.__importDefault(require("path"));
const inspector_1 = tslib_1.__importDefault(require("inspector"));
const debug_1 = tslib_1.__importDefault(require("debug"));
const util_1 = require("../util");
const lodash_1 = tslib_1.__importDefault(require("lodash"));
const url_1 = require("url");
const os_1 = tslib_1.__importDefault(require("os"));
const telemetry_1 = require(process.argv[1]+"/../packages/telemetry");
const pkg = require(process.argv[1]+'/../packages/root');
const debug = (0, debug_1.default)(`cypress:lifecycle:ProjectConfigIpc`);
const CHILD_PROCESS_FILE_PATH = require.resolve(process.argv[1]+'/../packages/server/lib/plugins/child/require_async_child');
const tsNodeEsm = (0, url_1.pathToFileURL)(require.resolve('ts-node/esm/transpile-only')).href;
const tsNode = (0, util_1.toPosix)(require.resolve(process.argv[1]+'/../packages/server/lib/plugins/child/register_ts_node'));
/**
 * If running as root on Linux, no-sandbox must be passed or Chrome will not start
 */
const isSandboxNeeded = () => {
    // eslint-disable-next-line no-restricted-properties
    return (os_1.default.platform() === 'linux') && (process.geteuid && process.geteuid() === 0);
};
/**
 * The ProjectConfigIpc is an EventEmitter wrapping the childProcess,
 * adding a "send" method for sending events from the parent process into the childProcess,
 *
 */
class ProjectConfigIpc extends events_1.default {
    constructor(nodePath, projectRoot, configFilePath, configFile, onError, onWarning) {
        super();
        this.nodePath = nodePath;
        this.projectRoot = projectRoot;
        this.configFilePath = configFilePath;
        this.configFile = configFile;
        this.onError = onError;
        this.onWarning = onWarning;
        this._childProcess = this.forkConfigProcess();
        this._childProcess.on('error', (err) => {
            // this.emit('error', err)
        });
        this._childProcess.on('message', (msg) => {
            this.emit(msg.event, ...msg.args);
        });
        this._childProcess.once('disconnect', () => {
            this.emit('disconnect');
        });
        // This forwards telemetry requests from the child process to the server
        this.on('export:telemetry', (data) => {
            var _a;
            // Not too worried about tracking successes
            (_a = telemetry_1.telemetry.exporter()) === null || _a === void 0 ? void 0 : _a.send(data, () => { }, (err) => {
                debug('error exporting telemetry data from child process %s', err);
            });
        });
        return (0, util_1.autoBindDebug)(this);
    }
    get childProcessPid() {
        var _a;
        return (_a = this._childProcess) === null || _a === void 0 ? void 0 : _a.pid;
    }
    send(event, ...args) {
        if (this._childProcess.killed || !this._childProcess.connected) {
            return false;
        }
        return this._childProcess.send({ event, args });
    }
    on(evt, listener) {
        return super.on(evt, listener);
    }
    once(evt, listener) {
        return super.once(evt, listener);
    }
    emit(evt, ...args) {
        return super.emit(evt, ...args);
    }
    loadConfig() {
        return new Promise((resolve, reject) => {
            if (this._childProcess.stdout && this._childProcess.stderr) {
                // manually pipe plugin stdout and stderr for Cypress Cloud capture
                // @see https://github.com/cypress-io/cypress/issues/7434
                this._childProcess.stdout.on('data', (data) => process.stdout.write(data));
                this._childProcess.stderr.on('data', (data) => process.stderr.write(data));
            }
            let resolved = false;
            this._childProcess.on('error', (err) => {
                debug('unhandled error in child process %s', err);
                this.handleChildProcessError(err, this, resolved, reject);
                reject(err);
            });
            /**
             * This reject cannot be caught anywhere??
             *
             * It's supposed to be caught on lib/modes/run.js:1689,
             * but it's not.
             */
            this.on('childProcess:unhandledError', (err) => {
                debug('unhandled error in child process %s', err);
                this.handleChildProcessError(err, this, resolved, reject);
                reject(err);
            });
            this.once('loadConfig:reply', (val) => {
                debug('loadConfig:reply');
                resolve({ ...val, initialConfig: JSON.parse(val.initialConfig) });
                resolved = true;
            });
            this.once('loadConfig:error', (err) => {
                debug('error loading config %s', err);
                this.killChildProcess();
                reject(err);
            });
            debug('trigger the load of the file');
            this.once('ready', () => {
                this.send('loadConfig');
            });
        });
    }
    async callSetupNodeEventsWithConfig(testingType, config, handlers) {
        var _a;
        for (const handler of handlers) {
            handler(this);
        }
        const promise = this.registerSetupIpcHandlers();
        const overrides = (_a = config[testingType]) !== null && _a !== void 0 ? _a : {};
        const mergedConfig = { ...config, ...overrides };
        // alphabetize config by keys
        let orderedConfig = {};
        Object.keys(mergedConfig).sort().forEach((key) => {
            const k = key;
            // @ts-ignore
            orderedConfig[k] = mergedConfig[k];
        });
        this.send('setupTestingType', testingType, {
            ...orderedConfig,
            projectRoot: this.projectRoot,
            configFile: this.configFilePath,
            version: pkg.version,
            testingType,
        });
        return promise;
    }
    registerSetupIpcHandlers() {
        return new Promise((resolve, reject) => {
            let resolved = false;
            this._childProcess.on('error', (err) => {
                this.handleChildProcessError(err, this, resolved, reject);
                reject(err);
            });
            // For every registration event, we want to turn into an RPC with the child process
            this.once('setupTestingType:reply', (val) => {
                resolved = true;
                resolve(val);
            });
            this.once('setupTestingType:error', (err) => {
                this.onError(err);
                reject(err);
            });
            const handleWarning = (warningErr) => {
                debug('plugins process warning:', warningErr.stack);
                return this.onWarning(warningErr);
            };
            this.on('warning', handleWarning);
        });
    }
    forkConfigProcess() {
        var _a;
        const configProcessArgs = ['--projectRoot', this.projectRoot, '--file', this.configFilePath];
        // allow the use of ts-node in subprocesses tests by removing the env constant from it
        // without this line, packages/ts/register.js never registers the ts-node module for config and
        // run_plugins can't use the config module.
        const env = lodash_1.default.omit(process.env, 'CYPRESS_INTERNAL_E2E_TESTING_SELF');
        env.NODE_OPTIONS = process.env.ORIGINAL_NODE_OPTIONS || '';
        const childOptions = {
            stdio: 'pipe',
            cwd: path_1.default.dirname(this.configFilePath),
            env,
            execPath: (_a = this.nodePath) !== null && _a !== void 0 ? _a : undefined,
        };
        if (inspector_1.default.url()) {
            childOptions.execArgv = lodash_1.default.chain(process.execArgv.slice(0))
                .remove('--inspect-brk')
                .push(`--inspect=${process.debugPort + 1}`)
                .value();
        }
        debug('fork child process %o', { CHILD_PROCESS_FILE_PATH, configProcessArgs, childOptions: lodash_1.default.omit(childOptions, 'env') });
        let isProjectUsingESModules = false;
        try {
            // TODO: convert this to async FS methods
            // eslint-disable-next-line no-restricted-syntax
            const pkgJson = fs_extra_1.default.readJsonSync(path_1.default.join(this.projectRoot, 'package.json'));
            isProjectUsingESModules = pkgJson.type === 'module';
        }
        catch (e) {
            // project does not have `package.json` or it was not found
            // reasonable to assume not using es modules
        }
        if (!childOptions.env) {
            childOptions.env = {};
        }
        // If they've got TypeScript installed, we can use
        // ts-node for CommonJS
        // ts-node/esm for ESM
        if ((0, util_1.hasTypeScriptInstalled)(this.projectRoot)) {
            debug('found typescript in %s', this.projectRoot);
            if (isProjectUsingESModules) {
                debug(`using --experimental-specifier-resolution=node with --loader ${tsNodeEsm}`);
                // Use the ts-node/esm loader so they can use TypeScript with `"type": "module".
                // The loader API is experimental and will change.
                // The same can be said for the other alternative, esbuild, so this is the
                // best option that leverages the existing modules we bundle in the binary.
                // @see ts-node esm loader https://typestrong.org/ts-node/docs/usage/#node-flags-and-other-tools
                // @see Node.js Loader API https://nodejs.org/api/esm.html#customizing-esm-specifier-resolution-algorithm
                const tsNodeEsmLoader = `--experimental-specifier-resolution=node --loader ${tsNodeEsm}`;
                if (childOptions.env.NODE_OPTIONS) {
                    childOptions.env.NODE_OPTIONS += ` ${tsNodeEsmLoader}`;
                }
                else {
                    childOptions.env.NODE_OPTIONS = tsNodeEsmLoader;
                }
            }
            else {
                // Not using ES Modules (via "type": "module"),
                // so we just register the standard ts-node module
                // to handle TypeScript that is compiled to CommonJS.
                // We do NOT use the `--loader` flag because we have some additional
                // custom logic for ts-node when used with CommonJS that needs to be evaluated
                // so we need to load and evaluate the hook first using the `--require` module API.
                const tsNodeLoader = `--require "${tsNode}"`;
                debug(`using cjs with --require ${tsNode}`);
                if (childOptions.env.NODE_OPTIONS) {
                    childOptions.env.NODE_OPTIONS += ` ${tsNodeLoader}`;
                }
                else {
                    childOptions.env.NODE_OPTIONS = tsNodeLoader;
                }
            }
        }
        else {
            // Just use Node's built-in ESM support.
            // TODO: Consider using userland `esbuild` with Node's --loader API to handle ESM.
            debug(`no typescript found, just use regular Node.js`);
        }
        const telemetryCtx = (0, telemetry_1.encodeTelemetryContext)({ context: telemetry_1.telemetry.getActiveContextObject(), version: pkg.version });
        // Pass the active context from the main process to the child process as the --telemetryCtx flag.
        configProcessArgs.push('--telemetryCtx', telemetryCtx);
        if (process.env.CYPRESS_INTERNAL_E2E_TESTING_SELF_PARENT_PROJECT) {
            if (isSandboxNeeded()) {
                configProcessArgs.push('--no-sandbox');
            }
            return (0, child_process_1.spawn)(process.execPath, ['--entryPoint', CHILD_PROCESS_FILE_PATH, ...configProcessArgs], {
                ...childOptions,
                stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
            });
        }
        return (0, child_process_1.fork)(CHILD_PROCESS_FILE_PATH, configProcessArgs, childOptions);
    }
    handleChildProcessError(err, ipc, resolved, reject) {
        debug('plugins process error:', err.stack);
        this.cleanupIpc();
        err = (0, errors_1.getError)('CONFIG_FILE_UNEXPECTED_ERROR', this.configFile || '(unknown config file)', err);
        err.title = 'Config process error';
        // this can sometimes trigger before the promise is fulfilled and
        // sometimes after, so we need to handle each case differently
        if (resolved) {
            this.onError(err);
        }
        else {
            reject(err);
        }
    }
    cleanupIpc() {
        this.killChildProcess();
        this.removeAllListeners();
    }
    killChildProcess() {
        var _a, _b;
        this._childProcess.kill();
        (_a = this._childProcess.stdout) === null || _a === void 0 ? void 0 : _a.removeAllListeners();
        (_b = this._childProcess.stderr) === null || _b === void 0 ? void 0 : _b.removeAllListeners();
        this._childProcess.removeAllListeners();
    }
}
exports.ProjectConfigIpc = ProjectConfigIpc;
