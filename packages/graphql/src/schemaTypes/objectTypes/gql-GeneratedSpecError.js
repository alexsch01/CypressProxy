"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeneratedSpecError = void 0;
const nexus_1 = require("nexus");
exports.GeneratedSpecError = (0, nexus_1.objectType)({
    name: 'GeneratedSpecError',
    description: 'Error from generated spec',
    definition(t) {
        t.nonNull.string('fileName');
        t.nonNull.string('erroredCodegenCandidate');
    },
});
