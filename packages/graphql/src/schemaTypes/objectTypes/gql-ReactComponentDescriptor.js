"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReactComponentDescriptor = void 0;
const nexus_1 = require("nexus");
exports.ReactComponentDescriptor = (0, nexus_1.objectType)({
    name: 'ReactComponentDescriptor',
    description: 'Properties describing a React component',
    definition(t) {
        t.nonNull.string('exportName', {
            description: 'The name of the component export e.g. "export const Foo"',
        });
        t.nonNull.boolean('isDefault', {
            description: 'Whether the component is a default export e.g. "export default Foo"',
        });
    },
});
