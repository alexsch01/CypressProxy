"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RunSpecResponse = void 0;
const nexus_1 = require("nexus");
exports.RunSpecResponse = (0, nexus_1.objectType)({
    name: 'RunSpecResponse',
    description: 'Result of a runSpec mutation',
    definition(t) {
        t.nonNull.string('testingType', {
            description: 'Testing Type that spec was launched in',
        });
        t.nonNull.field('browser', {
            type: 'Browser',
            description: 'Browser test was launched in',
        });
        t.nonNull.field('spec', {
            type: 'Spec',
            description: 'Matched spec that was launched',
        });
    },
});
