"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestingTypeEnum = exports.CodeLanguageEnum = exports.SupportStatusEnum = exports.WizardConfigFileStatusEnum = exports.SupportedBundlerEnum = void 0;
const types_1 = require(process.argv[1]+"/../packages/types");
const scaffold_config_1 = require(process.argv[1]+"/../packages/scaffold-config");
const nexus_1 = require("nexus");
exports.SupportedBundlerEnum = (0, nexus_1.enumType)({
    name: 'SupportedBundlers',
    description: 'The bundlers that we can use with Cypress',
    members: scaffold_config_1.WIZARD_BUNDLERS.map((t) => t.type),
});
exports.WizardConfigFileStatusEnum = (0, nexus_1.enumType)({
    name: 'WizardConfigFileStatusEnum',
    members: ['changes', 'valid', 'skipped', 'error'],
});
exports.SupportStatusEnum = (0, nexus_1.enumType)({
    name: 'SupportStatusEnum',
    members: scaffold_config_1.SUPPORT_STATUSES,
});
exports.CodeLanguageEnum = (0, nexus_1.enumType)({
    name: 'CodeLanguageEnum',
    members: types_1.CODE_LANGUAGES.map((t) => t.type),
});
exports.TestingTypeEnum = (0, nexus_1.enumType)({
    name: 'TestingTypeEnum',
    members: ['e2e', 'component'],
});
