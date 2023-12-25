"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Node = void 0;
const tslib_1 = require("tslib");
const nexus_1 = require("nexus");
const assert_1 = tslib_1.__importDefault(require("assert"));
exports.Node = (0, nexus_1.interfaceType)({
    name: 'Node',
    description: 'Implements the Relay Node spec',
    definition(t) {
        t.nonNull.id('id', {
            description: 'Globally unique identifier representing a concrete GraphQL ObjectType',
            resolve: (source) => {
                throw new Error('Abstract resolve, should be handled separately');
            },
        });
    },
    resolveType: (t) => {
        if (!t.__typename) {
            (0, assert_1.default)(t.__typename, `Cannot resolve Node without __typename: saw ${String(t)}`);
        }
        return t.__typename;
    },
});
