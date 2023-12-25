"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WizardErroredFramework = void 0;
const nexus_1 = require("nexus");
exports.WizardErroredFramework = (0, nexus_1.objectType)({
    name: 'WizardErroredFramework',
    description: 'Represents a Framework Definition that failed to load when detected',
    node: 'path',
    definition(t) {
        t.string('path', {
            description: `The location of the framework's package.json file`,
        });
    },
});
