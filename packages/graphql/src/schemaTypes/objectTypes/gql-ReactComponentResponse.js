"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReactComponentResponse = void 0;
const nexus_1 = require("nexus");
const gql_ReactComponentDescriptor_1 = require("./gql-ReactComponentDescriptor");
exports.ReactComponentResponse = (0, nexus_1.objectType)({
    name: 'ReactComponentResponse',
    description: 'Response from getReactComponentsFromFile',
    definition(t) {
        t.nonNull.list.nonNull.field('components', {
            type: gql_ReactComponentDescriptor_1.ReactComponentDescriptor,
            description: 'Components that are exported from the parsed file',
        });
        t.boolean('errored', {
            description: 'Whether or not there was there an error when parsing the file',
        });
    },
});
