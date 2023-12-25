"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.nexusSlowGuardPlugin = void 0;
const tslib_1 = require("tslib");
const nexus_1 = require("nexus");
const utils_1 = require("nexus/dist/utils");
const chalk_1 = tslib_1.__importDefault(require("chalk"));
const HANGING_RESOLVER_THRESHOLD = 100;
exports.nexusSlowGuardPlugin = (0, nexus_1.plugin)({
    name: 'NexusSlowGuard',
    description: 'If there is a very slow / hanging execution of a field, we detect/log to the console it in development',
    fieldDefTypes: 'slowLogThreshold?: number | false',
    // When we create a field resolver, we can wrap it in a field
    onCreateFieldResolver(field) {
        var _a, _b, _c;
        const threshold = ((_c = (_b = (_a = field.fieldConfig.extensions) === null || _a === void 0 ? void 0 : _a.nexus) === null || _b === void 0 ? void 0 : _b.config.slowLogThreshold) !== null && _c !== void 0 ? _c : HANGING_RESOLVER_THRESHOLD);
        return (root, args, ctx, info, next) => {
            // Don't worry about slowness in Mutations / Subscriptions, these aren't blocking the execution of initial load
            if (info.operation.operation === 'mutation' || info.operation.operation === 'subscription') {
                return next(root, args, ctx, info);
            }
            const result = next(root, args, ctx, info);
            if ((0, utils_1.isPromiseLike)(result) && threshold !== false) {
                const resolvePath = (0, utils_1.pathToArray)(info.path);
                const start = process.hrtime.bigint();
                const hanging = setTimeout(() => {
                    var _a, _b;
                    const operationId = `${info.operation.operation} ${(_b = (_a = info.operation.name) === null || _a === void 0 ? void 0 : _a.value) !== null && _b !== void 0 ? _b : `(anonymous)`}`;
                    if (process.env.CYPRESS_INTERNAL_ENV !== 'production') {
                        const totalMS = (process.hrtime.bigint() - start) / BigInt(1000000);
                        // eslint-disable-next-line no-console
                        console.error(chalk_1.default.red(`\n\nNexusSlowGuard: Taking more than ${threshold}ms to execute ${JSON.stringify(resolvePath)} for ${operationId} (total time ${totalMS}ms)\n\n`));
                    }
                }, threshold);
                return nexus_1.plugin.completeValue(result, (val) => {
                    clearTimeout(hanging);
                    return val;
                }, (err) => {
                    clearTimeout(hanging);
                    throw err;
                });
            }
            return result;
        };
    },
});
