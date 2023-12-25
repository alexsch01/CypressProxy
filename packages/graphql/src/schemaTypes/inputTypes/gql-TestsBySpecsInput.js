"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestsBySpecInput = void 0;
const nexus_1 = require("nexus");
exports.TestsBySpecInput = (0, nexus_1.inputObjectType)({
    name: 'TestsBySpecInput',
    description: 'Represents the input for setting a mapping of test titles by the spec path',
    definition(t) {
        t.nonNull.string('specPath', {
            description: 'Path to the spec relative to the project',
        });
        t.nonNull.list.nonNull.string('tests', {
            description: 'Full test title which should be all parts joined by a space',
        });
    },
});
