"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScaffoldedFile = void 0;
const nexus_1 = require("nexus");
const gql_FileParts_1 = require("./gql-FileParts");
const enumTypes_1 = require("../enumTypes");
exports.ScaffoldedFile = (0, nexus_1.objectType)({
    name: 'ScaffoldedFile',
    description: 'A file that we just added to the filesystem during project setup',
    definition(t) {
        t.nonNull.field('status', {
            description: 'Info about the field',
            type: enumTypes_1.WizardConfigFileStatusEnum,
        });
        t.nonNull.string('description', {
            description: 'Info about the file we just scaffolded',
        });
        t.nonNull.field('file', {
            type: gql_FileParts_1.FileParts,
            description: 'Info about the file',
        });
    },
});
