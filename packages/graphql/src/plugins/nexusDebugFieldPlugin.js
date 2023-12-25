"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.nexusDebugLogPlugin = void 0;
const tslib_1 = require("tslib");
const nexus_1 = require("nexus");
const debug_1 = tslib_1.__importDefault(require("debug"));
const Path_1 = require("graphql/jsutils/Path");
const debugField = (0, debug_1.default)(`cypress-verbose:graphql:fields`);
const SLOW_FIELD_THRESHOLD = 100; // Log any field taking longer than 100ms
const delta = (d) => {
    return new Date().valueOf() - d.valueOf();
};
exports.nexusDebugLogPlugin = (0, nexus_1.plugin)({
    name: 'NexusDebugLogPlugin',
    description: 'Wraps the resolve & adds debug logs for operations, and for fields if there is a slow execution.',
    // When we create a field resolver, we can wrap it in a field
    onCreateFieldResolver(info) {
        // For fields, we only want to log if the field takes longer than SLOW_FIELD_THRESHOLD to execute.
        // Also log if it's hanging for some reason
        return (root, args, ctx, info, next) => {
            const start = new Date();
            const resolvePath = (0, Path_1.pathToArray)(info.path);
            function maybeLog(suffix = '') {
                var _a, _b;
                if (delta(start) > SLOW_FIELD_THRESHOLD) {
                    debugField(`${info.operation.operation} ${(_b = (_a = info.operation.name) === null || _a === void 0 ? void 0 : _a.value) !== null && _b !== void 0 ? _b : `(anonymous)`} took ${delta(start)}ms to resolve ${JSON.stringify(resolvePath)}${suffix}`);
                }
            }
            return nexus_1.plugin.completeValue(next(root, args, ctx, info), (val) => {
                maybeLog();
                return val;
            }, (err) => {
                maybeLog();
                throw err;
            });
        };
    },
});
