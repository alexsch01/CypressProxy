"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CohortInput = exports.Cohort = void 0;
const nexus_1 = require("nexus");
exports.Cohort = (0, nexus_1.objectType)({
    name: 'Cohort',
    description: 'used to distinguish one group of users from another',
    definition(t) {
        t.nonNull.string('name', { description: 'name used to identify the cohort topic (e.g. "LoginBanner" ) ' });
        t.nonNull.string('cohort', { description: 'value used to indicate the cohort (e.g. "A" or "B")' });
    },
});
exports.CohortInput = (0, nexus_1.inputObjectType)({
    name: 'CohortInput',
    definition(t) {
        t.nonNull.string('name', { description: 'Name of the cohort' });
        t.nonNull.list.nonNull.string('cohorts', { description: 'Array of cohort options to choose from.  Ex: A or B ' });
        t.list.nonNull.int('weights', { description: 'Optional array of integer weights to use for determining cohort. Defaults to even weighting' });
    },
});
