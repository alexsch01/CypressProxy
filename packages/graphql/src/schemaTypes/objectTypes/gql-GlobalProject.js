"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GlobalProject = void 0;
const nexus_1 = require("nexus");
exports.GlobalProject = (0, nexus_1.objectType)({
    name: 'GlobalProject',
    description: 'A project which exists on the filesystem but has not been opened',
    node: 'projectRoot',
    definition(t) {
        t.implements('ProjectLike');
    },
});
