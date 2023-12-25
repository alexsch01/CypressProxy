"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WizardBundler = void 0;
const nexus_1 = require("nexus");
const enumTypes_1 = require("../enumTypes");
exports.WizardBundler = (0, nexus_1.objectType)({
    name: 'WizardBundler',
    description: 'Wizard bundler',
    node: 'type',
    definition(t) {
        t.nonNull.boolean('isDetected', {
            description: 'Whether this is the detected bundler',
            resolve: (source, args, ctx) => { var _a; return ((_a = ctx.coreData.wizard.detectedBundler) === null || _a === void 0 ? void 0 : _a.type) === source.type; },
        });
        t.nonNull.field('type', {
            type: enumTypes_1.SupportedBundlerEnum,
            description: 'The name of the framework',
        });
        t.nonNull.string('name', {
            description: 'Display name of the bundler',
        });
    },
});
