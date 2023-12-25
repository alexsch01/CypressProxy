"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VersionData = void 0;
const nexus_1 = require("nexus");
const gql_Version_1 = require("./gql-Version");
exports.VersionData = (0, nexus_1.objectType)({
    name: 'VersionData',
    description: 'Version of Cypress and release date',
    definition(t) {
        t.nonNull.field('latest', {
            type: gql_Version_1.Version,
            description: 'latest version of cypress',
        });
        t.nonNull.field('current', {
            type: gql_Version_1.Version,
            description: 'current version of cypress you are using',
        });
    },
});
