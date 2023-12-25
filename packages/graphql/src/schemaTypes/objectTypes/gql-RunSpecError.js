"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RunSpecError = void 0;
const nexus_1 = require("nexus");
const enumTypes_1 = require("../enumTypes");
exports.RunSpecError = (0, nexus_1.objectType)({
    name: 'RunSpecError',
    description: 'Error encountered during a runSpec mutation',
    definition(t) {
        t.nonNull.field('code', {
            type: enumTypes_1.RunSpecErrorCodeEnum,
        });
        t.string('detailMessage', {
            description: 'Contextual information for the error (typically an expanded error message)',
        });
    },
});
