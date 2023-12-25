"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeneratedSpecResult = void 0;
const nexus_1 = require("nexus");
exports.GeneratedSpecResult = (0, nexus_1.unionType)({
    name: 'GeneratedSpecResult',
    definition(t) {
        t.members('ScaffoldedFile', 'GeneratedSpecError');
    },
    resolveType: (obj) => {
        // @ts-expect-error
        if (obj.fileName) {
            return 'GeneratedSpecError';
        }
        return 'ScaffoldedFile';
    },
});
