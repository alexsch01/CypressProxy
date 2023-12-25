"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CodeGenGlobs = void 0;
const nexus_1 = require("nexus");
exports.CodeGenGlobs = (0, nexus_1.objectType)({
    name: 'CodeGenGlobs',
    description: 'Glob patterns for detecting files for code gen.',
    node: 'component',
    definition(t) {
        t.nonNull.string('component');
    },
});
