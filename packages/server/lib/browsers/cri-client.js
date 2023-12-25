"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.create = exports.DEFAULT_NETWORK_ENABLE_OPTIONS = void 0;
const tslib_1 = require("tslib");
const chrome_remote_interface_1 = tslib_1.__importDefault(require("chrome-remote-interface"));
const debug_1 = tslib_1.__importDefault(require("debug"));
const lodash_1 = tslib_1.__importDefault(require("lodash"));
const errors = tslib_1.__importStar(require("../errors"));
const debug = (0, debug_1.default)('cypress:server:browsers:cri-client');
// debug using cypress-verbose:server:browsers:cri-client:send:*
const debugVerboseSend = (0, debug_1.default)('cypress-verbose:server:browsers:cri-client:send:[-->]');
// debug using cypress-verbose:server:browsers:cri-client:recv:*
const debugVerboseReceive = (0, debug_1.default)('cypress-verbose:server:browsers:cri-client:recv:[<--]');
const WEBSOCKET_NOT_OPEN_RE = /^WebSocket is (?:not open|already in CLOSING or CLOSED state)/;
exports.DEFAULT_NETWORK_ENABLE_OPTIONS = {
    maxTotalBufferSize: 0,
    maxResourceBufferSize: 0,
    maxPostDataSize: 0,
};
const maybeDebugCdpMessages = (cri) => {
    if (debugVerboseReceive.enabled) {
        cri._ws.prependListener('message', (data) => {
            data = lodash_1.default
                .chain(JSON.parse(data))
                .tap((data) => {
                ([
                    'params.data', // screencast frame data
                    'result.data', // screenshot data
                ]).forEach((truncatablePath) => {
                    const str = lodash_1.default.get(data, truncatablePath);
                    if (!lodash_1.default.isString(str)) {
                        return;
                    }
                    lodash_1.default.set(data, truncatablePath, lodash_1.default.truncate(str, {
                        length: 100,
                        omission: `... [truncated string of total bytes: ${str.length}]`,
                    }));
                });
                return data;
            })
                .value();
            debugVerboseReceive('received CDP message %o', data);
        });
    }
    if (debugVerboseSend.enabled) {
        const send = cri._ws.send;
        cri._ws.send = (data, callback) => {
            debugVerboseSend('sending CDP command %o', JSON.parse(data));
            return send.call(cri._ws, data, callback);
        };
    }
};
const create = async ({ target, onAsynchronousError, host, port, onReconnect, protocolManager, fullyManageTabs, browserClient, }) => {
    const subscriptions = [];
    const enableCommands = [];
    let enqueuedCommands = [];
    let closed = false; // has the user called .close on this?
    let connected = false; // is this currently connected to CDP?
    let crashed = false; // has this crashed?
    let cri;
    let client;
    const reconnect = async (retryIndex) => {
        var _a;
        connected = false;
        if (closed) {
            debug('disconnected, not reconnecting because client is closed %o', { closed, target });
            enqueuedCommands = [];
            return;
        }
        (_a = client.onReconnectAttempt) === null || _a === void 0 ? void 0 : _a.call(client, retryIndex);
        debug('disconnected, attempting to reconnect... %o', { retryIndex, closed, target });
        await connect();
        debug('restoring subscriptions + running *.enable and queued commands... %o', { subscriptions, enableCommands, enqueuedCommands, target });
        subscriptions.forEach((sub) => {
            cri.on(sub.eventName, sub.cb);
        });
        // '*.enable' commands need to be resent on reconnect or any events in
        // that namespace will no longer be received
        await Promise.all(enableCommands.map(({ command, params, sessionId }) => {
            return cri.send(command, params, sessionId);
        }));
        enqueuedCommands.forEach((cmd) => {
            cri.send(cmd.command, cmd.params, cmd.sessionId).then(cmd.p.resolve, cmd.p.reject);
        });
        enqueuedCommands = [];
        if (onReconnect) {
            onReconnect(client);
        }
    };
    const retryReconnect = async () => {
        debug('disconnected, starting retries to reconnect... %o', { closed, target });
        const retry = async (retryIndex = 0) => {
            retryIndex++;
            try {
                return await reconnect(retryIndex);
            }
            catch (err) {
                if (closed) {
                    debug('could not reconnect because client is closed %o', { closed, target });
                    enqueuedCommands = [];
                    return;
                }
                debug('could not reconnect, retrying... %o', { closed, target, err });
                if (retryIndex < 20) {
                    await new Promise((resolve) => setTimeout(resolve, 100));
                    return retry(retryIndex);
                }
                const cdpError = errors.get('CDP_COULD_NOT_RECONNECT', err);
                // If we cannot reconnect to CDP, we will be unable to move to the next set of specs since we use CDP to clean up and close tabs. Marking this as fatal
                cdpError.isFatalApiErr = true;
                onAsynchronousError(cdpError);
            }
        };
        return retry();
    };
    const connect = async () => {
        await (cri === null || cri === void 0 ? void 0 : cri.close());
        debug('connecting %o', { connected, target });
        cri = await (0, chrome_remote_interface_1.default)({
            host,
            port,
            target,
            local: true,
            useHostName: true,
        });
        connected = true;
        debug('connected %o', { connected, target });
        maybeDebugCdpMessages(cri);
        // Having a host set indicates that this is the child cri target, a.k.a.
        // the main Cypress tab (as opposed to the root browser cri target)
        const isChildTarget = !!host;
        // don't reconnect in these circumstances
        if (
        // is a child target. we only need to reconnect the root browser target
        !isChildTarget
            // running cypress in cypress - there are a lot of disconnects that happen
            // that we don't want to reconnect on
            && !process.env.CYPRESS_INTERNAL_E2E_TESTING_SELF) {
            cri.on('disconnect', retryReconnect);
        }
        // We're only interested in child target traffic. Browser cri traffic is
        // handled in browser-cri-client.ts. The basic approach here is we attach
        // to targets and enable network traffic. We must attach in a paused state
        // so that we can enable network traffic before the target starts running.
        if (isChildTarget) {
            cri.on('Target.targetCrashed', async (event) => {
                if (event.targetId !== target) {
                    return;
                }
                debug('crash detected');
                crashed = true;
            });
            if (fullyManageTabs) {
                cri.on('Target.attachedToTarget', async (event) => {
                    var _a;
                    try {
                        // Service workers get attached at the page and browser level. We only want to handle them at the browser level
                        // We don't track child tabs/page network traffic. 'other' targets can't have network enabled
                        if (event.targetInfo.type !== 'service_worker' && event.targetInfo.type !== 'page' && event.targetInfo.type !== 'other') {
                            await cri.send('Network.enable', (_a = protocolManager === null || protocolManager === void 0 ? void 0 : protocolManager.networkEnableOptions) !== null && _a !== void 0 ? _a : exports.DEFAULT_NETWORK_ENABLE_OPTIONS, event.sessionId);
                        }
                        if (event.waitingForDebugger) {
                            await cri.send('Runtime.runIfWaitingForDebugger', undefined, event.sessionId);
                        }
                    }
                    catch (error) {
                        // it's possible that the target was closed before we could enable network and continue, in that case, just ignore
                        debug('error attaching to target cri', error);
                    }
                });
                // Ideally we could use filter rather than checking the type above, but that was added relatively recently
                await cri.send('Target.setAutoAttach', { autoAttach: true, waitForDebuggerOnStart: true, flatten: true });
                await cri.send('Target.setDiscoverTargets', { discover: true });
            }
        }
    };
    await connect();
    client = {
        targetId: target,
        async send(command, params, sessionId) {
            if (crashed) {
                return Promise.reject(new Error(`${command} will not run as the target browser or tab CRI connection has crashed`));
            }
            const enqueue = () => {
                debug('enqueueing command', { command, params });
                return new Promise((resolve, reject) => {
                    const obj = {
                        command,
                        p: { resolve, reject },
                    };
                    if (params) {
                        obj.params = params;
                    }
                    if (sessionId) {
                        obj.sessionId = sessionId;
                    }
                    enqueuedCommands.push(obj);
                });
            };
            // Keep track of '*.enable' commands so they can be resent when
            // reconnecting
            if (command.endsWith('.enable') || ['Runtime.addBinding', 'Target.setDiscoverTargets'].includes(command)) {
                const obj = {
                    command,
                };
                if (params) {
                    obj.params = params;
                }
                if (sessionId) {
                    obj.sessionId = sessionId;
                }
                enableCommands.push(obj);
            }
            if (connected) {
                try {
                    return await cri.send(command, params, sessionId);
                }
                catch (err) {
                    // This error occurs when the browser has been left open for a long
                    // time and/or the user's computer has been put to sleep. The
                    // socket disconnects and we need to recreate the socket and
                    // connection
                    if (!WEBSOCKET_NOT_OPEN_RE.test(err.message)) {
                        throw err;
                    }
                    debug('encountered closed websocket on send %o', { command, params, sessionId, err });
                    const p = enqueue();
                    await retryReconnect();
                    // if enqueued commands were wiped out from the reconnect and the socket is already closed, reject the command as it will never be run
                    if (enqueuedCommands.length === 0 && closed) {
                        debug('connection was closed was trying to reconnect');
                        return Promise.reject(new Error(`${command} will not run as browser CRI connection was reset`));
                    }
                    return p;
                }
            }
            return enqueue();
        },
        on(eventName, cb) {
            subscriptions.push({ eventName, cb });
            debug('registering CDP on event %o', { eventName });
            cri.on(eventName, cb);
            // This ensures that we are notified about the browser's network events that have been registered (e.g. service workers)
            // Long term we should use flat mode entirely across all of chrome remote interface
            if (eventName.startsWith('Network.')) {
                browserClient === null || browserClient === void 0 ? void 0 : browserClient.on(eventName, cb);
            }
        },
        off(eventName, cb) {
            subscriptions.splice(subscriptions.findIndex((sub) => {
                return sub.eventName === eventName && sub.cb === cb;
            }), 1);
            cri.off(eventName, cb);
            // This ensures that we are notified about the browser's network events that have been registered (e.g. service workers)
            // Long term we should use flat mode entirely across all of chrome remote interface
            if (eventName.startsWith('Network.')) {
                browserClient === null || browserClient === void 0 ? void 0 : browserClient.off(eventName, cb);
            }
        },
        get ws() {
            return cri._ws;
        },
        get queue() {
            return {
                enableCommands,
                enqueuedCommands,
                subscriptions,
            };
        },
        get closed() {
            return closed;
        },
        get connected() {
            return connected;
        },
        async close() {
            if (closed) {
                debug('not closing, cri client is already closed %o', { closed, target });
                return;
            }
            debug('closing cri client %o', { closed, target });
            closed = true;
            return cri.close()
                .finally(() => {
                debug('closed cri client %o', { closed, target });
            });
        },
    };
    return client;
};
exports.create = create;
