"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectPreferences = void 0;
const nexus_1 = require("nexus");
exports.ProjectPreferences = (0, nexus_1.objectType)({
    name: 'ProjectPreferences',
    description: 'Preferences specific to a project',
    definition(t) {
        t.string('testingType', {
            description: 'The preferred testing type to start in',
        });
    },
});
