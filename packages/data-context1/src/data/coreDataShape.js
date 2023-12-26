"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.makeCoreData = void 0;
const types_1 = require(process.argv[1]+"/../packages/types");
const scaffold_config_1 = require(process.argv[1]+"/../packages/scaffold-config");
const node_machine_id_1 = require("node-machine-id");
/**
 * All state for the app should live here for now
 */
function makeCoreData(modeOptions = {}) {
    var _a, _b, _c, _d;
    return {
        servers: {},
        cliBrowser: (_a = modeOptions.browser) !== null && _a !== void 0 ? _a : null,
        cliTestingType: (_b = modeOptions.testingType) !== null && _b !== void 0 ? _b : null,
        machineId: machineId(),
        machineBrowsers: null,
        allBrowsers: null,
        hasInitializedMode: null,
        cloudGraphQLError: null,
        dev: {
            refreshState: null,
        },
        app: {
            isGlobalMode: Boolean(modeOptions.global),
            browsers: null,
            projects: [],
            nodePath: modeOptions.userNodePath,
            browserStatus: 'closed',
            browserUserAgent: null,
            relaunchBrowser: false,
        },
        localSettings: {
            availableEditors: [],
            preferences: {},
            refreshing: null,
        },
        authState: {
            browserOpened: false,
        },
        currentProject: (_c = modeOptions.projectRoot) !== null && _c !== void 0 ? _c : null,
        diagnostics: { error: null, warnings: [] },
        currentProjectGitInfo: null,
        currentTestingType: (_d = modeOptions.testingType) !== null && _d !== void 0 ? _d : null,
        wizard: {
            chosenBundler: null,
            chosenFramework: null,
            chosenManualInstall: false,
            detectedBundler: null,
            detectedFramework: null,
            // TODO: API to add third party frameworks to this list.
            frameworks: scaffold_config_1.CT_FRAMEWORKS.map((framework) => (0, scaffold_config_1.resolveComponentFrameworkDefinition)(framework)),
            erroredFrameworks: [],
        },
        migration: {
            step: 'renameAuto',
            videoEmbedHtml: null,
            legacyConfigForMigration: null,
            filteredSteps: [...types_1.MIGRATION_STEPS],
            flags: {
                hasCustomIntegrationFolder: false,
                hasCustomIntegrationTestFiles: false,
                hasCustomComponentFolder: false,
                hasCustomComponentTestFiles: false,
                hasCustomSupportFile: false,
                hasComponentTesting: true,
                hasE2ESpec: true,
                hasPluginsFile: true,
                shouldAddCustomE2ESpecPattern: false,
            },
        },
        activeBrowser: null,
        user: null,
        electron: {
            app: null,
            browserWindow: null,
        },
        scaffoldedFiles: null,
        packageManager: 'npm',
        forceReconfigureProject: null,
        versionData: null,
        cloudProject: {
            testsForRunResults: {},
        },
        eventCollectorSource: null,
    };
    async function machineId() {
        try {
            return await (0, node_machine_id_1.machineId)();
        }
        catch (error) {
            return null;
        }
    }
}
exports.makeCoreData = makeCoreData;
