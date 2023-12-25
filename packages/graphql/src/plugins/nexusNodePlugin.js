"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.nodePlugin = void 0;
const nexus_1 = require("nexus");
exports.nodePlugin = (0, nexus_1.plugin)({
    name: 'NodePlugin',
    objectTypeDefTypes: `
    node?: (TypeName extends keyof NexusGenRootTypes ? keyof NexusGenRootTypes[TypeName] : never) | core.FieldResolver<TypeName, 'id'>`,
    onObjectDefinition(def, { node }) {
        if (node != null) {
            let resolveFn;
            if (typeof node === 'function') {
                resolveFn = (root, args, ctx, info) => {
                    return ctx.makeId(def.typeName, node(root, args, ctx, info));
                };
            }
            else if (typeof node === 'string') {
                resolveFn = (root, args, ctx) => {
                    return ctx.makeId(def.typeName, assertNonNull(root[node]));
                };
            }
            else {
                throw new Error(`Expected ${String(node)} to be a string or fn, saw.`);
            }
            def.implements('Node');
            def.nonNull.id('id', {
                description: `Relay style Node ID field for the ${def.typeName} field`,
                resolve: resolveFn,
            });
        }
    },
});
function assertNonNull(val) {
    if (val == null) {
        throw new Error(`Expected val to be non-null. This should never happen`);
    }
    return val;
}
