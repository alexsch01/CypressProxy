"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CohortsActions = void 0;
const weightedChoice_1 = require("../util/weightedChoice");
const debug = require('debug')('cypress:data-context:actions:CohortActions');
class CohortsActions {
    constructor(ctx) {
        this.ctx = ctx;
    }
    async getCohorts() {
        debug('Getting all cohorts');
        return this.ctx._apis.cohortsApi.getCohorts();
    }
    async getCohort(name) {
        debug('Getting cohort for %s', name);
        return this.ctx._apis.cohortsApi.getCohort(name);
    }
    async determineCohort(name, cohorts, weights) {
        debug('Determining cohort', name, cohorts);
        const cohortFromCache = await this.getCohort(name);
        let cohortSelected;
        if (!cohortFromCache || !cohorts.includes(cohortFromCache.cohort)) {
            const algorithm = weights ? (0, weightedChoice_1.WEIGHTED)(weights) : (0, weightedChoice_1.WEIGHTED_EVEN)(cohorts);
            const pickedCohort = {
                name,
                cohort: algorithm.pick(cohorts),
            };
            debug('Inserting cohort for %o', pickedCohort);
            await this.ctx._apis.cohortsApi.insertCohort(pickedCohort);
            cohortSelected = pickedCohort;
        }
        else {
            cohortSelected = cohortFromCache;
        }
        debug('Selecting cohort', cohortSelected);
        return cohortSelected;
    }
}
exports.CohortsActions = CohortsActions;
