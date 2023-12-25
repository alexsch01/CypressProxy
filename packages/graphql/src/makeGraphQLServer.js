"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.graphQLHTTP = exports.graphqlWS = exports.handleGraphQLSocketRequest = exports.makeGraphQLServer = void 0;
const tslib_1 = require("tslib");
const express_1 = tslib_1.__importDefault(require("express"));
const data_context_1 = require(process.argv[1]+"/../packages/data-context");
const p_defer_1 = tslib_1.__importDefault(require("p-defer"));
const cors_1 = tslib_1.__importDefault(require("cors"));
const socket_1 = require(process.argv[1]+"/../packages/socket");
const express_graphql_1 = require("express-graphql");
const server_destroy_1 = tslib_1.__importDefault(require("server-destroy"));
const send_1 = tslib_1.__importDefault(require("send"));
const resolve_dist_1 = require(process.argv[1]+"/../packages/resolve-dist");
const http_proxy_1 = tslib_1.__importDefault(require("http-proxy"));
const debug_1 = tslib_1.__importDefault(require("debug"));
const ws_1 = require("ws");
const ws_2 = require("graphql-ws/lib/use/ws");
const schema_1 = require("./schema");
const graphql_1 = require("graphql");
const debug = (0, debug_1.default)(`cypress-verbose:graphql:operation`);
const IS_DEVELOPMENT = process.env.CYPRESS_INTERNAL_ENV !== 'production';
let gqlSocketServer;
let gqlServer;
data_context_1.globalPubSub.on('reset:data-context', (ctx) => {
    ctx.actions.servers.setGqlServer(gqlServer);
    ctx.actions.servers.setGqlSocketServer(gqlSocketServer);
});
async function makeGraphQLServer() {
    const dfd = (0, p_defer_1.default)();
    const app = (0, express_1.default)();
    app.use((0, cors_1.default)());
    app.get('/cloud-notification', (req, res) => {
        const ctx = (0, data_context_1.getCtx)();
        const operationName = req.query.operationName;
        if (!operationName || Array.isArray(operationName)) {
            res.sendStatus(200);
            return;
        }
        switch (operationName) {
            case 'orgCreated':
                ctx.cloud.invalidate('Query', 'cloudViewer')
                    .then(() => {
                    ctx.emitter.cloudViewerChange();
                })
                    .catch(ctx.logTraceError);
                break;
            default:
                break;
        }
        res.sendStatus(200);
    });
    app.use('/__launchpad/graphql/:operationName?', exports.graphQLHTTP);
    function makeProxy() {
        if (process.env.CYPRESS_INTERNAL_VITE_DEV) {
            const viteProxy = http_proxy_1.default.createProxyServer({
                target: `http://localhost:${process.env.CYPRESS_INTERNAL_VITE_LAUNCHPAD_PORT}/`,
            });
            return (req, res) => {
                viteProxy.web(req, res, {}, (e) => { });
            };
        }
        return (req, res) => {
            var _a;
            (0, send_1.default)(req, (_a = req.params[0]) !== null && _a !== void 0 ? _a : '', {
                root: (0, resolve_dist_1.getPathToDist)('launchpad'),
            }).pipe(res);
        };
    }
    app.get('/__launchpad/*', makeProxy());
    const ctx = (0, data_context_1.getCtx)();
    const graphqlPort = process.env.CYPRESS_INTERNAL_GRAPHQL_PORT;
    let srv;
    function listenCallback() {
        const port = srv.address().port;
        const endpoint = `http://localhost:${port}/__launchpad/graphql`;
        if (process.env.NODE_ENV === 'development') {
            /* eslint-disable-next-line no-console */
            console.log(`GraphQL server is running at ${endpoint}`);
        }
        debug(`GraphQL Server at ${endpoint}`);
        gqlServer = srv;
        ctx.actions.servers.setGqlServer(srv);
        dfd.resolve(port);
    }
    srv = graphqlPort ? app.listen(graphqlPort, listenCallback) : app.listen(listenCallback);
    (0, server_destroy_1.default)(srv);
    const socketSrv = new socket_1.SocketIOServer(srv, {
        path: '/__launchpad/socket',
        transports: ['websocket'],
    });
    gqlSocketServer = socketSrv.of('/data-context');
    (0, exports.graphqlWS)(srv, '/__launchpad/graphql-ws');
    gqlSocketServer.on('connection', (socket) => {
        socket.on('graphql:request', handleGraphQLSocketRequest);
    });
    ctx.actions.servers.setGqlSocketServer(gqlSocketServer);
    return dfd.promise;
}
exports.makeGraphQLServer = makeGraphQLServer;
// TODO: replace this w/ persisted queries
/**
 * Handles the GraphQL operation run over WebSockets,
 * rather than HTTP to clear up the console from extra chatter
 * that doesn't originate from the users' web app.
 * @param uid
 * @param data
 * @param callback
 */
async function handleGraphQLSocketRequest(uid, payload, callback) {
    var _a;
    try {
        const operation = JSON.parse(payload);
        const context = (0, data_context_1.getCtx)();
        const document = (0, graphql_1.parse)(operation.query);
        data_context_1.DataContext.addActiveRequest();
        const result = await (0, graphql_1.execute)({
            operationName: operation.operationName,
            variableValues: operation.variables,
            document,
            schema: schema_1.graphqlSchema,
            contextValue: graphqlRequestContext({
                app: 'app',
                context,
                document,
                variables: (_a = operation.variables) !== null && _a !== void 0 ? _a : null,
            }),
        });
        callback(result);
    }
    catch (e) {
        callback({ data: null, errors: [e] });
    }
    finally {
        data_context_1.DataContext.finishActiveRequest();
    }
}
exports.handleGraphQLSocketRequest = handleGraphQLSocketRequest;
/**
 * Creates a new WSServer conforming to the GraphQL over Websocket protocol:
 * https://github.com/enisdenjo/graphql-ws/blob/master/PROTOCOL.md
 *
 * @param httpServer The http server we are utilizing for the websocket
 * @param targetRoute Route to target in the server upgrade event
 * @returns Disposable Function to cleanup the created server resource
 */
const graphqlWS = (httpServer, targetRoute) => {
    const graphqlWs = new ws_1.Server({ noServer: true });
    httpServer.on('upgrade', (req, socket, head) => {
        var _a;
        if ((_a = req.url) === null || _a === void 0 ? void 0 : _a.startsWith(targetRoute)) {
            return graphqlWs.handleUpgrade(req, socket, head, (client) => {
                graphqlWs.emit('connection', client, req);
            });
        }
    });
    (0, ws_2.useServer)({
        schema: schema_1.graphqlSchema,
        context: () => (0, data_context_1.getCtx)(),
    }, graphqlWs);
    return graphqlWs;
};
exports.graphqlWS = graphqlWS;
/**
 * An Express middleware function handler which can be added to
 * routes expected to service a GraphQL request from an HTTP client.
 */
exports.graphQLHTTP = (0, express_graphql_1.graphqlHTTP)((req, res, params) => {
    const context = (0, data_context_1.getCtx)();
    let document;
    // Parse the query ahead-of-time, so we can use in the graphqlRequestContext
    try {
        // @ts-expect-error
        document = (0, graphql_1.parse)(params.query);
    }
    catch (_a) {
        // error will be re-thrown in customParseFn below
    }
    return {
        schema: schema_1.graphqlSchema,
        graphiql: IS_DEVELOPMENT,
        context: params && document ? graphqlRequestContext({
            req: req,
            context,
            document,
            variables: params.variables,
        }) : undefined,
        customParseFn: (source) => {
            // No need to re-parse if we have a document, otherwise re-parse to throw the error
            return document !== null && document !== void 0 ? document : (0, graphql_1.parse)(source);
        },
        customExecuteFn: (args) => {
            var _a;
            const date = new Date();
            const prefix = `${(_a = args.operationName) !== null && _a !== void 0 ? _a : '(anonymous)'}`;
            data_context_1.DataContext.addActiveRequest();
            return Promise.resolve((0, graphql_1.execute)(args)).then((val) => {
                var _a, _b;
                debug(`${prefix} completed in ${new Date().valueOf() - date.valueOf()}ms with ${(_b = (_a = val.errors) === null || _a === void 0 ? void 0 : _a.length) !== null && _b !== void 0 ? _b : 0} errors`);
                return val;
            }).finally(() => {
                data_context_1.DataContext.finishActiveRequest();
            });
        },
    };
});
/**
 * Since the DataContext is considered a singleton throughout the electron app process,
 * we create a Proxy object for it, adding metadata associated each GraphQL operation.
 * This is used in middleware, such as the `nexusDeferIfNotLoadedPlugin`, to associate
 * remote requests to operations needing to be refetched on the client.
 */
function graphqlRequestContext(options) {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    const app = (_a = options.app) !== null && _a !== void 0 ? _a : (((_b = options.req) === null || _b === void 0 ? void 0 : _b.originalUrl.startsWith('/__launchpad')) ? 'launchpad' : 'app');
    const primaryOperation = getPrimaryOperation(options.document);
    const requestInfo = {
        app,
        operation: ((_c = primaryOperation === null || primaryOperation === void 0 ? void 0 : primaryOperation.kind) !== null && _c !== void 0 ? _c : 'query'),
        document: options.document,
        headers: (_e = (_d = options.req) === null || _d === void 0 ? void 0 : _d.headers) !== null && _e !== void 0 ? _e : {},
        variables: options.variables,
        operationName: (_g = (_f = primaryOperation === null || primaryOperation === void 0 ? void 0 : primaryOperation.name) === null || _f === void 0 ? void 0 : _f.value) !== null && _g !== void 0 ? _g : null,
    };
    debug('Creating context for %s, operation %s', app, (_h = primaryOperation === null || primaryOperation === void 0 ? void 0 : primaryOperation.name) === null || _h === void 0 ? void 0 : _h.value);
    return new Proxy(options.context, {
        get(target, p, receiver) {
            if (p === 'graphqlRequestInfo') {
                return requestInfo;
            }
            if (p === 'actions' && IS_DEVELOPMENT && requestInfo.operation === 'query') {
                throw new Error(`Cannot access ctx.${p} within a query, only within mutations / outside of a GraphQL request\n` +
                    `Seen in operation: ${requestInfo.operationName}`);
            }
            return Reflect.get(target, p, receiver);
        },
    });
}
function getPrimaryOperation(query) {
    return query.definitions.find(isOperationDefinitionNode);
}
function isOperationDefinitionNode(node) {
    return node.kind === graphql_1.Kind.OPERATION_DEFINITION;
}
