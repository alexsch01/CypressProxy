"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CloudProjectActions = void 0;
const tslib_1 = require("tslib");
const core_1 = require("@urql/core");
const debug_1 = tslib_1.__importDefault(require("debug"));
const debug = (0, debug_1.default)('cypress:data-context:CloudProjectActions');
const CLOUD_PROJECT_INFO_OPERATION_DOC = (0, core_1.gql) `
  query CloudActions_CloudProjectInfo ($projectSlug: String!) {
    cloudProjectBySlug(slug: $projectSlug) {
      __typename
      ... on CloudProject {
        id
        name
      }
    }
  }`;
class CloudProjectActions {
    constructor(ctx) {
        this.ctx = ctx;
    }
    /**
     * Clear out any data relating to the cloud project.
     * Used when changing projects (eg via global mode) to ensure stale data is not shown.
     */
    clearCloudProject() {
        this.ctx.update((d) => {
            d.cloudProject = {};
        });
    }
    /**
     * Fetches basic information about an associated Cloud project.
     * Tries to use cached data, and falls back to fetching the data
     * from the remote endpoint.
     */
    async fetchMetadata() {
        var _a, _b;
        const projectSlug = await this.ctx.project.projectId();
        const result = await this.ctx.cloud.executeRemoteGraphQL({
            fieldName: 'cloudProjectBySlug',
            operationDoc: CLOUD_PROJECT_INFO_OPERATION_DOC,
            operationVariables: {
                projectSlug,
            },
            requestPolicy: 'network-only',
        });
        if (((_b = (_a = result.data) === null || _a === void 0 ? void 0 : _a.cloudProjectBySlug) === null || _b === void 0 ? void 0 : _b.__typename) !== 'CloudProject') {
            debug('Returning empty');
            return;
        }
        const { name, id } = result.data.cloudProjectBySlug;
        this.ctx.update((cd) => {
            cd.cloudProject.metadata = {
                name, id,
            };
        });
        return this.ctx.coreData.cloudProject.metadata;
    }
}
exports.CloudProjectActions = CloudProjectActions;
