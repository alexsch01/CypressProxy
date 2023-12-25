"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WizardFrontendFramework = void 0;
const nexus_1 = require("nexus");
const scaffold_config_1 = require(process.argv[1]+"/../packages/scaffold-config");
const enumTypes_1 = require("../enumTypes");
const gql_WizardBundler_1 = require("./gql-WizardBundler");
exports.WizardFrontendFramework = (0, nexus_1.objectType)({
    name: 'WizardFrontendFramework',
    description: 'A frontend framework that we can setup within the app',
    node: 'type',
    definition(t) {
        t.nonNull.string('type', {
            description: 'The unique identifier for a framework or library',
        }),
            t.nonNull.string('category', {
                description: 'The category (framework, like react-scripts, or library, like react',
            }),
            t.nonNull.string('name', {
                description: 'The display name of the framework',
            });
        t.nonNull.field('supportStatus', {
            description: 'Current support status of the framework',
            type: enumTypes_1.SupportStatusEnum,
        });
        t.nonNull.boolean('isSelected', {
            description: 'Whether this is the selected framework in the wizard',
            resolve: (source, args, ctx) => { var _a; return ((_a = ctx.coreData.wizard.chosenFramework) === null || _a === void 0 ? void 0 : _a.type) === source.type; },
        });
        t.nonNull.boolean('isDetected', {
            description: 'Whether this is the detected framework',
            resolve: (source, args, ctx) => { var _a; return ((_a = ctx.coreData.wizard.detectedFramework) === null || _a === void 0 ? void 0 : _a.type) === source.type; },
        });
        t.nonNull.list.nonNull.field('supportedBundlers', {
            type: gql_WizardBundler_1.WizardBundler,
            description: 'All of the supported bundlers for this framework',
            resolve: (source, args, ctx) => {
                var _a, _b;
                const findBundler = (type) => {
                    const b = scaffold_config_1.WIZARD_BUNDLERS.find((b) => b.type === type);
                    if (!b) {
                        throw Error(`Invalid bundler: ${type}`);
                    }
                    return b;
                };
                return (_b = (_a = ctx.coreData.wizard.chosenFramework) === null || _a === void 0 ? void 0 : _a.supportedBundlers.map(findBundler)) !== null && _b !== void 0 ? _b : [];
            },
        });
        t.string('icon', {
            description: 'Raw SVG icon of framework',
        });
    },
});
