"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WizardActions = void 0;
const tslib_1 = require("tslib");
const scaffold_config_1 = require(process.argv[1]+"/../packages/scaffold-config");
const assert_1 = tslib_1.__importDefault(require("assert"));
const path_1 = tslib_1.__importDefault(require("path"));
const debug_1 = tslib_1.__importDefault(require("debug"));
const fs_extra_1 = tslib_1.__importDefault(require("fs-extra"));
const debug = (0, debug_1.default)('cypress:data-context:wizard-actions');
const config_1 = require(process.argv[1]+"/../packages/config");
const component_index_template_1 = tslib_1.__importDefault(require(process.argv[1]+"/../packages/scaffold-config/src/component-index-template"));
class WizardActions {
    constructor(ctx) {
        this.ctx = ctx;
    }
    get projectRoot() {
        (0, assert_1.default)(this.ctx.currentProject);
        return this.ctx.currentProject;
    }
    setFramework(framework) {
        var _a, _b, _c, _d, _e, _f, _g;
        const next = this.ctx.coreData.wizard.frameworks.find((x) => x.type === (framework === null || framework === void 0 ? void 0 : framework.type));
        this.ctx.update((coreData) => {
            coreData.wizard.chosenFramework = framework;
        });
        if (((_a = next === null || next === void 0 ? void 0 : next.supportedBundlers) === null || _a === void 0 ? void 0 : _a[0]) && next.supportedBundlers.length === 1) {
            this.setBundler((_b = next === null || next === void 0 ? void 0 : next.supportedBundlers) === null || _b === void 0 ? void 0 : _b[0]);
            return;
        }
        const { chosenBundler } = this.ctx.coreData.wizard;
        // if the previous bundler was incompatible with the
        // new framework that was selected, we need to reset it
        const doesNotSupportChosenBundler = (_e = (chosenBundler && !new Set((_d = (_c = this.ctx.coreData.wizard.chosenFramework) === null || _c === void 0 ? void 0 : _c.supportedBundlers) !== null && _d !== void 0 ? _d : []).has(chosenBundler.type))) !== null && _e !== void 0 ? _e : false;
        const prevFramework = (_g = (_f = this.ctx.coreData.wizard.chosenFramework) === null || _f === void 0 ? void 0 : _f.type) !== null && _g !== void 0 ? _g : null;
        if (!prevFramework || doesNotSupportChosenBundler || !['react', 'vue'].includes(prevFramework)) {
            this.setBundler(null);
        }
    }
    getNullableBundler(bundler) {
        if (!bundler) {
            return null;
        }
        try {
            return (0, scaffold_config_1.getBundler)(bundler);
        }
        catch (e) {
            return null;
        }
    }
    setBundler(bundler) {
        this.ctx.update((coreData) => {
            coreData.wizard.chosenBundler = this.getNullableBundler(bundler);
        });
        return this.ctx.coreData.wizard;
    }
    async completeSetup() {
        debug('completeSetup');
        this.ctx.update((d) => {
            d.scaffoldedFiles = null;
        });
        await this.ctx.lifecycleManager.refreshLifecycle();
    }
    /// reset wizard status, useful for when changing to a new project
    resetWizard() {
        this.ctx.update((coreData) => {
            coreData.wizard.chosenBundler = null;
            coreData.wizard.chosenFramework = null;
            coreData.wizard.detectedBundler = null;
            coreData.wizard.detectedFramework = null;
        });
        return this.ctx.coreData.wizard;
    }
    async initialize() {
        if (!this.ctx.currentProject) {
            return;
        }
        this.resetWizard();
        await this.initializeFramework();
    }
    async initializeFramework() {
        if (!this.ctx.currentProject) {
            return;
        }
        const detected = await (0, scaffold_config_1.detectFramework)(this.ctx.currentProject, this.ctx.coreData.wizard.frameworks);
        debug('detected %o', detected);
        if (detected) {
            this.ctx.update((coreData) => {
                var _a, _b, _c;
                coreData.wizard.detectedFramework = (_a = detected.framework) !== null && _a !== void 0 ? _a : null;
                coreData.wizard.chosenFramework = (_b = detected.framework) !== null && _b !== void 0 ? _b : null;
                if (!((_c = detected.framework) === null || _c === void 0 ? void 0 : _c.supportedBundlers[0])) {
                    return;
                }
                coreData.wizard.detectedBundler = this.getNullableBundler(detected.bundler || detected.framework.supportedBundlers[0]);
                coreData.wizard.chosenBundler = this.getNullableBundler(detected.bundler || detected.framework.supportedBundlers[0]);
            });
            this.ctx.emitter.frameworkDetectionChange();
        }
    }
    /**
     * Scaffolds the testing type, by creating the necessary files & assigning to
     */
    async scaffoldTestingType() {
        const { currentTestingType } = this.ctx.coreData;
        (0, assert_1.default)(currentTestingType && 'currentTestingType is required');
        switch (currentTestingType) {
            case 'e2e': {
                const scaffoldedFiles = await this.scaffoldE2E();
                this.ctx.update((d) => {
                    d.scaffoldedFiles = scaffoldedFiles;
                });
                this.ctx.lifecycleManager.refreshMetaState();
                this.ctx.actions.project.setForceReconfigureProjectByTestingType({ forceReconfigureProject: false, testingType: 'e2e' });
                return;
            }
            case 'component': {
                const { chosenBundler, chosenFramework } = this.ctx.coreData.wizard;
                (0, assert_1.default)(chosenBundler && chosenFramework, 'chosenBundler & chosenFramework are required');
                const scaffoldedFiles = await this.scaffoldComponent();
                this.ctx.update((d) => {
                    d.scaffoldedFiles = scaffoldedFiles;
                });
                this.ctx.lifecycleManager.refreshMetaState();
                this.ctx.actions.project.setForceReconfigureProjectByTestingType({ forceReconfigureProject: false, testingType: 'component' });
                return;
            }
            default:
                throw new Error('Unreachable');
        }
    }
    async detectFrameworks() {
        if (!this.ctx.currentProject) {
            return;
        }
        const officialFrameworks = scaffold_config_1.CT_FRAMEWORKS.map((framework) => (0, scaffold_config_1.resolveComponentFrameworkDefinition)(framework));
        const { frameworks: thirdParty, erroredFrameworks } = await (0, scaffold_config_1.detectThirdPartyCTFrameworks)(this.ctx.currentProject);
        const resolvedThirdPartyFrameworks = thirdParty.map(scaffold_config_1.resolveComponentFrameworkDefinition);
        debug('errored third party frameworks %o', erroredFrameworks);
        this.ctx.update((d) => {
            d.wizard.frameworks = officialFrameworks.concat(resolvedThirdPartyFrameworks);
            d.wizard.erroredFrameworks = erroredFrameworks;
        });
    }
    async scaffoldE2E() {
        // Order of the scaffoldedFiles is intentional, confirm before changing
        const scaffoldedFiles = await Promise.all([
            this.scaffoldConfig('e2e'),
            this.scaffoldSupport('e2e', this.ctx.lifecycleManager.fileExtensionToUse),
            this.scaffoldSupport('commands', this.ctx.lifecycleManager.fileExtensionToUse),
            this.scaffoldFixtures(),
        ]);
        return scaffoldedFiles;
    }
    async scaffoldComponent() {
        debug('scaffoldComponent');
        const { chosenBundler, chosenFramework } = this.ctx.coreData.wizard;
        (0, assert_1.default)(chosenFramework && chosenBundler);
        // Order of the scaffoldedFiles is intentional, confirm before changing
        const scaffoldedFiles = await Promise.all([
            this.scaffoldConfig('component'),
            this.scaffoldSupport('component', this.ctx.lifecycleManager.fileExtensionToUse),
            this.scaffoldSupport('commands', this.ctx.lifecycleManager.fileExtensionToUse),
            this.scaffoldComponentIndexHtml(chosenFramework),
            this.scaffoldFixtures(),
        ]);
        return scaffoldedFiles;
    }
    async scaffoldSupport(fileName, language) {
        const supportFile = path_1.default.join(this.projectRoot, `cypress/support/${fileName}.${language}`);
        const supportDir = path_1.default.dirname(supportFile);
        // @ts-ignore
        await this.ctx.fs.mkdir(supportDir, { recursive: true });
        let fileContent;
        let description = '';
        if (fileName === 'commands') {
            fileContent = (0, scaffold_config_1.commandsFileBody)(language);
            description = 'A support file that is useful for creating custom Cypress commands and overwriting existing ones.';
        }
        else if (fileName === 'e2e') {
            fileContent = (0, scaffold_config_1.supportFileE2E)(language);
            description = 'The support file that is bundled and loaded before each E2E spec.';
        }
        else if (fileName === 'component') {
            (0, assert_1.default)(this.ctx.coreData.wizard.chosenFramework);
            const mountModule = await this.ctx.coreData.wizard.chosenFramework.mountModule(this.projectRoot);
            fileContent = (0, scaffold_config_1.supportFileComponent)(language, mountModule);
            description = 'The support file that is bundled and loaded before each component testing spec.';
        }
        (0, assert_1.default)(fileContent);
        await this.scaffoldFile(supportFile, fileContent, 'Scaffold default support file');
        return {
            status: 'valid',
            description,
            file: {
                absolute: supportFile,
            },
        };
    }
    async scaffoldConfig(testingType) {
        var _a, _b, _c, _d, _e;
        debug('scaffoldConfig');
        if (!this.ctx.lifecycleManager.metaState.hasValidConfigFile) {
            this.ctx.lifecycleManager.setConfigFilePath(`cypress.config.${this.ctx.lifecycleManager.fileExtensionToUse}`);
        }
        const configFilePath = this.ctx.lifecycleManager.configFilePath;
        const testingTypeInfo = testingType === 'e2e' ? {
            testingType: 'e2e',
        } : {
            testingType: 'component',
            bundler: (_b = (_a = this.ctx.coreData.wizard.chosenBundler) === null || _a === void 0 ? void 0 : _a.package) !== null && _b !== void 0 ? _b : 'webpack',
            framework: (_c = this.ctx.coreData.wizard.chosenFramework) === null || _c === void 0 ? void 0 : _c.configFramework,
            specPattern: (_d = this.ctx.coreData.wizard.chosenFramework) === null || _d === void 0 ? void 0 : _d.specPattern,
        };
        const result = await (0, config_1.addTestingTypeToCypressConfig)({
            isProjectUsingESModules: this.ctx.lifecycleManager.metaState.isProjectUsingESModules,
            filePath: configFilePath,
            info: testingTypeInfo,
            projectRoot: this.projectRoot,
        });
        const description = (testingType === 'e2e')
            ? 'The Cypress config file for E2E testing.'
            : 'The Cypress config file where the component testing dev server is configured.';
        const descriptions = {
            ADDED: description,
            MERGED: `Added ${testingType} to the Cypress config file.`,
            CHANGES: 'Merge this code with your existing config file.',
        };
        if (result.result === 'ADDED' || result.result === 'MERGED') {
            return {
                status: 'valid',
                description: descriptions[result.result],
                file: {
                    absolute: configFilePath,
                    contents: await fs_extra_1.default.readFile(configFilePath, 'utf8'),
                },
            };
        }
        return {
            status: 'changes',
            description: descriptions.CHANGES,
            file: {
                absolute: this.ctx.lifecycleManager.configFilePath,
                contents: (_e = result.codeToMerge) !== null && _e !== void 0 ? _e : '',
            },
        };
    }
    async scaffoldFixtures() {
        const exampleScaffoldPath = path_1.default.join(this.projectRoot, 'cypress/fixtures/example.json');
        try {
            const fixturesPath = path_1.default.join(this.projectRoot, 'cypress/fixtures');
            await this.ctx.fs.stat(fixturesPath);
            return {
                status: 'skipped',
                description: 'An example fixture for data imported into your Cypress tests, such as `cy.intercept()`.',
                file: {
                    absolute: exampleScaffoldPath,
                    contents: '// Skipped',
                },
            };
        }
        catch (_a) {
            await this.ensureDir('fixtures');
            return this.scaffoldFile(exampleScaffoldPath, `${JSON.stringify(FIXTURE_DATA, null, 2)}\n`, 'Added an example fixtures file/folder');
        }
    }
    async scaffoldComponentIndexHtml(chosenFramework) {
        var _a, _b;
        const componentIndexHtmlPath = path_1.default.join(this.projectRoot, 'cypress', 'support', 'component-index.html');
        await this.ensureDir('support');
        const defaultComponentIndex = (0, component_index_template_1.default)();
        return this.scaffoldFile(componentIndexHtmlPath, (_b = (_a = chosenFramework.componentIndexHtml) === null || _a === void 0 ? void 0 : _a.call(chosenFramework)) !== null && _b !== void 0 ? _b : defaultComponentIndex(), 'The HTML wrapper that each component is served with. Used for global fonts, CSS, JS, HTML, etc.');
    }
    async scaffoldFile(filePath, contents, description) {
        try {
            debug('scaffoldFile: start %s', filePath);
            debug('scaffoldFile: with content', contents);
            await this.ctx.fs.writeFile(filePath, contents, { flag: 'wx' });
            debug('scaffoldFile: done %s', filePath);
            return {
                status: 'valid',
                description,
                file: {
                    absolute: filePath,
                },
            };
        }
        catch (e) {
            if (e.code === 'EEXIST') {
                return {
                    status: 'skipped',
                    description: 'File already exists',
                    file: {
                        absolute: filePath,
                    },
                };
            }
            return {
                status: 'error',
                description: e.message || 'Error writing file',
                file: {
                    absolute: filePath,
                    contents,
                },
            };
        }
    }
    ensureDir(type) {
        return this.ctx.fs.ensureDir(path_1.default.join(this.projectRoot, 'cypress', type));
    }
}
exports.WizardActions = WizardActions;
const FIXTURE_DATA = {
    'name': 'Using fixtures to represent data',
    'email': 'hello@cypress.io',
    'body': 'Fixtures are a great way to mock data for responses to routes',
};
