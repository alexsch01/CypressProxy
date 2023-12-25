"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RunSpecResult = void 0;
const nexus_1 = require("nexus");
exports.RunSpecResult = (0, nexus_1.unionType)({
    name: 'RunSpecResult',
    definition(t) {
        t.members('RunSpecResponse', 'RunSpecError');
    },
    resolveType: (obj) => {
        return 'code' in obj ? 'RunSpecError' : 'RunSpecResponse';
    },
});
