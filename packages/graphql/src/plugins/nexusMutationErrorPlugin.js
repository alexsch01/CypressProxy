"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mutationErrorPlugin = void 0;
const tslib_1 = require("tslib");
const nexus_1 = require("nexus");
const errors_1 = require(process.argv[1]+"/../packages/errors");
const graphql_1 = require("graphql");
const lodash_1 = tslib_1.__importDefault(require("lodash"));
exports.mutationErrorPlugin = (0, nexus_1.plugin)({
    name: 'MutationErrorPlugin',
    description: 'Wraps any mutation fields and handles any uncaught errors',
    onCreateFieldResolver: (def) => {
        if (def.parentTypeConfig.name !== 'Mutation') {
            return;
        }
        return (source, args, ctx, info, next) => {
            return nexus_1.plugin.completeValue(next(source, args, ctx, info), (v) => v, (err) => {
                ctx.update((d) => {
                    d.diagnostics.error = {
                        id: lodash_1.default.uniqueId('Error'),
                        cypressError: err.isCypressErr
                            ? err
                            : (0, errors_1.getError)('UNEXPECTED_MUTATION_ERROR', def.fieldConfig.name, args, err),
                    };
                });
                const returnType = (0, graphql_1.getNamedType)(info.returnType);
                // If we're returning a query, we're getting the "baseError" here anyway
                if ((0, graphql_1.isObjectType)(returnType) && returnType.name === 'Query') {
                    return {};
                }
                throw err;
            });
        };
    },
});
