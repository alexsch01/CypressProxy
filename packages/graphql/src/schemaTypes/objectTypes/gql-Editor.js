"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Editor = void 0;
const nexus_1 = require("nexus");
exports.Editor = (0, nexus_1.objectType)({
    name: 'Editor',
    description: 'Represents an editor on the local machine',
    definition(t) {
        t.nonNull.string('id');
        t.nonNull.string('name', {
            description: 'name of editor',
        });
        t.string('binary', {
            description: 'Binary that opens the editor',
        });
    },
});
