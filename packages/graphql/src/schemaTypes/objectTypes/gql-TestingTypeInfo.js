"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestingTypeInfo = void 0;
const nexus_1 = require("nexus");
const gql_WizardEnums_1 = require("../enumTypes/gql-WizardEnums");
exports.TestingTypeInfo = (0, nexus_1.objectType)({
    name: 'TestingTypeInfo',
    node: 'type',
    definition(t) {
        t.nonNull.field('type', {
            type: gql_WizardEnums_1.TestingTypeEnum,
        });
        t.nonNull.string('description');
        t.nonNull.string('title');
    },
});
