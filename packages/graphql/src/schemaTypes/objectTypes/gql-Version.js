"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Version = void 0;
const nexus_1 = require("nexus");
exports.Version = (0, nexus_1.objectType)({
    name: 'Version',
    description: 'Version of Cypress and release date',
    definition(t) {
        t.nonNull.string('id', {
            description: 'unique id',
        });
        t.nonNull.string('version', {
            description: 'Version number (follows semantic versioning)',
        });
        t.nonNull.string('released', {
            description: 'Release date as an iso8601 timestamp',
        });
    },
});
