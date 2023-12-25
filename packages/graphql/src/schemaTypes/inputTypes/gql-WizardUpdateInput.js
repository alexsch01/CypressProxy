"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WizardUpdateInput = void 0;
const nexus_1 = require("nexus");
const gql_WizardEnums_1 = require("../enumTypes/gql-WizardEnums");
exports.WizardUpdateInput = (0, nexus_1.inputObjectType)({
    name: 'WizardUpdateInput',
    definition(t) {
        t.string('framework');
        t.field('bundler', {
            type: gql_WizardEnums_1.SupportedBundlerEnum,
        });
    },
});
