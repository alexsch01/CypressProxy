"use strict";
var _ProjectDataSource_runAllSpecs;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectDataSource = exports.getPathFromSpecPattern = exports.getLongestCommonPrefixFromPaths = exports.transformSpec = exports.matchedSpecs = void 0;
const tslib_1 = require("tslib");
const os_1 = tslib_1.__importDefault(require("os"));
const chokidar_1 = tslib_1.__importDefault(require("chokidar"));
const minimatch_1 = tslib_1.__importDefault(require("minimatch"));
const lodash_1 = tslib_1.__importDefault(require("lodash"));
const path_1 = tslib_1.__importDefault(require("path"));
const debug_1 = tslib_1.__importDefault(require("debug"));
const common_path_prefix_1 = tslib_1.__importDefault(require("common-path-prefix"));
const config_1 = require(process.argv[1]+"/../packages/config");
const parse_glob_1 = tslib_1.__importDefault(require("parse-glob"));
const micromatch_1 = tslib_1.__importDefault(require("micromatch"));
const randexp_1 = tslib_1.__importDefault(require("randexp"));
const fs_1 = tslib_1.__importDefault(require("fs"));
const debug = (0, debug_1.default)('cypress:data-context:sources:ProjectDataSource');
const assert_1 = tslib_1.__importDefault(require("assert"));
const file_1 = require("../util/file");
const utils_1 = require("./migration/utils");
const toArray = (val) => val ? typeof val === 'string' ? [val] : val : undefined;
function matchedSpecs({ projectRoot, testingType, specAbsolutePaths, }) {
    debug('found specs %o', specAbsolutePaths);
    let commonRoot = '';
    if (specAbsolutePaths.length === 1) {
        commonRoot = path_1.default.dirname(specAbsolutePaths[0]);
    }
    else {
        commonRoot = (0, common_path_prefix_1.default)(specAbsolutePaths);
    }
    const specs = specAbsolutePaths.map((absolute) => {
        return transformSpec({ projectRoot, absolute, testingType, commonRoot, platform: os_1.default.platform(), sep: path_1.default.sep });
    });
    return specs;
}
exports.matchedSpecs = matchedSpecs;
function transformSpec({ projectRoot, absolute, testingType, commonRoot, platform, sep, }) {
    if (platform === 'win32') {
        absolute = (0, file_1.toPosix)(absolute, sep);
        projectRoot = (0, file_1.toPosix)(projectRoot, sep);
    }
    const relative = path_1.default.relative(projectRoot, absolute);
    const parsedFile = path_1.default.parse(absolute);
    const fileExtension = path_1.default.extname(absolute);
    const specFileExtension = ['.spec', '.test', '-spec', '-test', '.cy']
        .map((ext) => ext + fileExtension)
        .find((ext) => absolute.endsWith(ext)) || fileExtension;
    const parts = absolute.split(projectRoot);
    let name = parts[parts.length - 1] || '';
    if (name.startsWith('/')) {
        name = name.slice(1);
    }
    const LEADING_SLASH = /^\/|/g;
    const relativeToCommonRoot = absolute.replace(commonRoot, '').replace(LEADING_SLASH, '');
    return {
        fileExtension,
        baseName: parsedFile.base,
        fileName: parsedFile.base.replace(specFileExtension, ''),
        specFileExtension,
        relativeToCommonRoot,
        specType: testingType === 'component' ? 'component' : 'integration',
        name,
        relative,
        absolute,
    };
}
exports.transformSpec = transformSpec;
function getLongestCommonPrefixFromPaths(paths) {
    if (!paths[0])
        return '';
    function getPathParts(pathname) {
        return pathname.split(/[\/\\]/g);
    }
    const lcp = getPathParts(paths[0]);
    if (paths.length === 1)
        return lcp.slice(0, -1).join(path_1.default.sep);
    let endIndex = paths[0].length;
    for (const filename of paths.slice(1)) {
        const pathParts = getPathParts(filename);
        for (let i = endIndex - 1; i >= 0; i--) {
            if (lcp[i] !== pathParts[i]) {
                endIndex = i;
                delete lcp[i];
            }
        }
        if (lcp.length === 0)
            return '';
    }
    return lcp.slice(0, endIndex).join(path_1.default.sep);
}
exports.getLongestCommonPrefixFromPaths = getLongestCommonPrefixFromPaths;
function getPathFromSpecPattern({ specPattern, testingType, fileExtensionToUse, name = '' }) {
    function replaceWildCard(s, fallback) {
        return s.replace(/\*/g, fallback);
    }
    const parsedGlob = (0, parse_glob_1.default)(specPattern);
    if (!parsedGlob.is.glob) {
        return specPattern;
    }
    // Remove double-slashes from dirname (like if specPattern has /**/*/)
    let dirname = parsedGlob.path.dirname.replaceAll(/\/\/+/g, '/');
    // If a spec can be in any root dir, go ahead and use "cypress/"
    if (dirname.startsWith('**'))
        dirname = dirname.replace('**', 'cypress');
    const splittedDirname = dirname.split('/').filter((s) => s !== '**').map((x) => replaceWildCard(x, testingType)).join('/');
    const fileName = replaceWildCard(parsedGlob.path.filename, name ? name : testingType === 'e2e' ? 'spec' : 'ComponentName');
    const extnameWithoutExt = parsedGlob.path.extname.replace(parsedGlob.path.ext, '')
        || `.cy.${fileExtensionToUse}`;
    let extname = replaceWildCard(extnameWithoutExt, 'cy');
    if (extname.startsWith('.'))
        extname = extname.slice(1);
    if (extname.endsWith('.'))
        extname = extname.slice(0, -1);
    const basename = [fileName, extname, parsedGlob.path.ext].filter(Boolean).join('.');
    const glob = splittedDirname + basename;
    const globWithoutBraces = micromatch_1.default.braces(glob, { expand: true });
    let finalGlob;
    if (fileExtensionToUse) {
        finalGlob = globWithoutBraces.find((glob) => glob.includes(fileExtensionToUse)) || globWithoutBraces[0];
    }
    else {
        finalGlob = globWithoutBraces[0];
    }
    if (fileExtensionToUse) {
        const filteredGlob = (0, micromatch_1.default)(globWithoutBraces, `*.${fileExtensionToUse}`, { basename: true });
        if (filteredGlob === null || filteredGlob === void 0 ? void 0 : filteredGlob.length) {
            finalGlob = filteredGlob[0];
        }
    }
    if (!finalGlob) {
        return;
    }
    const randExp = new randexp_1.default(finalGlob.replace(/\./g, '\\.'));
    return randExp.gen();
}
exports.getPathFromSpecPattern = getPathFromSpecPattern;
class ProjectDataSource {
    constructor(ctx) {
        this.ctx = ctx;
        this._specWatcher = null;
        this._specs = [];
        this._hasNonExampleSpec = false;
        _ProjectDataSource_runAllSpecs.set(this, []);
    }
    get api() {
        return this.ctx._apis.projectApi;
    }
    projectId() {
        return this.ctx.lifecycleManager.getProjectId();
    }
    projectTitle(projectRoot) {
        return path_1.default.basename(projectRoot);
    }
    async getConfig() {
        return await this.ctx.lifecycleManager.getFullInitialConfig();
    }
    getCurrentProjectSavedState() {
        return this.api.getCurrentProjectSavedState();
    }
    get specs() {
        return this._specs;
    }
    setSpecs(specs) {
        this._specs = specs;
    }
    get runAllSpecs() {
        return tslib_1.__classPrivateFieldGet(this, _ProjectDataSource_runAllSpecs, "f");
    }
    setRunAllSpecs(specs) {
        tslib_1.__classPrivateFieldSet(this, _ProjectDataSource_runAllSpecs, specs, "f");
    }
    get hasNonExampleSpec() {
        return this._hasNonExampleSpec;
    }
    setHasNonExampleSpec(hasNonExampleSpec) {
        this._hasNonExampleSpec = hasNonExampleSpec;
    }
    setRelaunchBrowser(relaunchBrowser) {
        this.ctx.coreData.app.relaunchBrowser = relaunchBrowser;
    }
    /**
     * Retrieve the applicable spec patterns for the current testing type
     */
    async specPatterns() {
        const config = await this.getConfig();
        return {
            specPattern: toArray(config.specPattern),
            excludeSpecPattern: toArray(config.excludeSpecPattern),
        };
    }
    /**
     * Retrieve the applicable spec patterns for a given testing type. Can be used to check whether
     * a spec satisfies the pattern when outside a given testing type.
     */
    async specPatternsByTestingType(testingType) {
        var _a, _b, _c, _d, _e, _f, _g, _h;
        const configFile = await this.ctx.lifecycleManager.getConfigFileContents();
        if (testingType === 'e2e') {
            return {
                specPattern: toArray((_b = (_a = configFile.e2e) === null || _a === void 0 ? void 0 : _a.specPattern) !== null && _b !== void 0 ? _b : config_1.defaultSpecPattern.e2e),
                excludeSpecPattern: toArray((_d = (_c = configFile.e2e) === null || _c === void 0 ? void 0 : _c.excludeSpecPattern) !== null && _d !== void 0 ? _d : config_1.defaultExcludeSpecPattern.e2e),
            };
        }
        return {
            specPattern: toArray((_f = (_e = configFile.component) === null || _e === void 0 ? void 0 : _e.specPattern) !== null && _f !== void 0 ? _f : config_1.defaultSpecPattern.component),
            excludeSpecPattern: toArray((_h = (_g = configFile.component) === null || _g === void 0 ? void 0 : _g.excludeSpecPattern) !== null && _h !== void 0 ? _h : config_1.defaultExcludeSpecPattern.component),
        };
    }
    async findSpecs({ projectRoot, testingType, specPattern, configSpecPattern, excludeSpecPattern, additionalIgnorePattern, }) {
        let specAbsolutePaths = await this.ctx.file.getFilesByGlob(projectRoot, specPattern, {
            absolute: true,
            ignore: [...excludeSpecPattern, ...additionalIgnorePattern],
        });
        // If the specPattern and configSpecPattern are different,
        // it means the user passed something non-default via --spec (run mode only)
        // in this scenario, we want to grab everything that matches `--spec`
        // that falls within their default specPattern. The reason is so we avoid
        // attempting to run things that are not specs, eg source code, videos, etc.
        //
        // Example: developer wants to run tests associated with timers in packages/driver
        // So they run yarn cypress:run --spec **/timers*
        // we do **not** want to capture `timers.ts` (source code) or a video in
        // cypress/videos/timers.cy.ts.mp4, so we take the intersection between specPattern
        // and --spec.
        if (!lodash_1.default.isEqual(specPattern, configSpecPattern)) {
            const defaultSpecAbsolutePaths = await this.ctx.file.getFilesByGlob(projectRoot, configSpecPattern, {
                absolute: true,
                ignore: [...excludeSpecPattern, ...additionalIgnorePattern],
            });
            specAbsolutePaths = lodash_1.default.intersection(specAbsolutePaths, defaultSpecAbsolutePaths);
        }
        const matched = matchedSpecs({
            projectRoot,
            testingType,
            specAbsolutePaths,
            specPattern,
        });
        return matched;
    }
    async startSpecWatcher({ projectRoot, testingType, specPattern, configSpecPattern, excludeSpecPattern, additionalIgnorePattern, }) {
        await this.stopSpecWatcher();
        // Early return the spec watcher if we're in run mode, we do not want to
        // init a lot of files watchers that are unneeded
        if (this.ctx.isRunMode) {
            return;
        }
        const currentProject = this.ctx.currentProject;
        if (!currentProject) {
            throw new Error('Cannot start spec watcher without current project');
        }
        // When file system changes are detected, we retrieve any spec files matching
        // the determined specPattern. This function is debounced to limit execution
        // during sequential file operations.
        const onProjectFileSystemChange = lodash_1.default.debounce(async () => {
            const specs = await this.findSpecs({
                projectRoot,
                testingType,
                specPattern,
                configSpecPattern,
                excludeSpecPattern,
                additionalIgnorePattern,
            });
            if (lodash_1.default.isEqual(this.specs, specs)) {
                this.ctx.actions.project.refreshSpecs(specs);
                // If no differences are found, we do not need to emit events
                return;
            }
            this.ctx.actions.project.setSpecs(specs);
        }, 250);
        // We respond to all changes to the project's filesystem when
        // files or directories are added and removed that are not explicitly
        // ignored by config
        this._specWatcher = this._makeSpecWatcher({
            projectRoot,
            specPattern,
            excludeSpecPattern,
            additionalIgnorePattern,
        });
        // the 'all' event includes: add, addDir, change, unlink, unlinkDir
        this._specWatcher.on('all', onProjectFileSystemChange);
    }
    _makeSpecWatcher({ projectRoot, specPattern, excludeSpecPattern, additionalIgnorePattern }) {
        return chokidar_1.default.watch('.', {
            ignoreInitial: true,
            ignorePermissionErrors: true,
            cwd: projectRoot,
            ignored: ['**/node_modules/**', ...excludeSpecPattern, ...additionalIgnorePattern, (file, stats) => {
                    // Add a extra safe to prevent watching node_modules, in case the glob
                    // pattern is not taken into account by the ignored
                    if (file.includes('node_modules')) {
                        return true;
                    }
                    // We need stats arg to make the determination of whether to watch it, because we need to watch directories
                    // chokidar is extremely inconsistent in whether or not it has the stats arg internally
                    if (!stats) {
                        try {
                            // TODO: find a way to avoid this sync call - might require patching chokidar
                            // eslint-disable-next-line no-restricted-syntax
                            stats = fs_1.default.statSync(file);
                        }
                        catch (_a) {
                            // If the file/folder is removed do not ignore it, in case it is added
                            // again
                            return false;
                        }
                    }
                    // don't ignore directories
                    if (stats.isDirectory()) {
                        return false;
                    }
                    // If none of the spec patterns match, we don't need to watch it
                    return !specPattern.some((s) => (0, minimatch_1.default)(path_1.default.relative(projectRoot, file), s));
                }],
        });
    }
    async defaultSpecFileName() {
        var _a;
        const { specPattern = [] } = await this.ctx.project.specPatterns();
        let fileExtensionToUse = this.ctx.lifecycleManager.fileExtensionToUse;
        // If generating a component test then check whether there are JSX/TSX files present in the project.
        // If project uses JSX then user likely wants to use JSX for their tests as well.
        // JSX can be used (or not used) with a variety of frameworks depending on user preference/config, so
        // the only reliable way to determine is whether there are files with JSX extension present
        if (this.ctx.coreData.currentTestingType === 'component') {
            debug('Checking for jsx/tsx files to determine file extension for default spec filename');
            const projectJsxFiles = await this.ctx.file.getFilesByGlob((_a = this.ctx.currentProject) !== null && _a !== void 0 ? _a : '', '**/*.[jt]sx');
            if (projectJsxFiles.length > 0) {
                debug('At least one jsx/tsx file found in project, utilizing for default spec filename');
                const generatedSpecFileName = await (0, utils_1.getDefaultSpecFileName)({
                    currentProject: this.ctx.currentProject,
                    testingType: this.ctx.coreData.currentTestingType,
                    fileExtensionToUse: `${fileExtensionToUse}x`,
                    specs: this.specs,
                    specPattern,
                });
                // There is the possibility that a specPattern has been configured to exclude spec files using jsx/tsx extensions
                // In this case, fallback to default logic which will generate js/ts filename
                if (await this.matchesSpecPattern(generatedSpecFileName)) {
                    return generatedSpecFileName;
                }
                debug('jsx/tsx extension would violate configured specPattern, utilizing default spec filename');
            }
            else {
                debug('No jsx/tsx files found, utilizing default spec filename');
            }
        }
        return (0, utils_1.getDefaultSpecFileName)({
            currentProject: this.ctx.currentProject,
            testingType: this.ctx.coreData.currentTestingType,
            fileExtensionToUse,
            specs: this.specs,
            specPattern,
        });
    }
    /**
     * Determines whether a given spec file satisfies the spec pattern *and* does not satisfy any
     * exclusionary pattern. By default it will check the spec pattern for the currently-active
     * testing type, but a target testing type can be supplied via optional parameter.
     */
    async matchesSpecPattern(specFile, testingType) {
        const targetTestingType = testingType || this.ctx.coreData.currentTestingType;
        if (!this.ctx.currentProject || !targetTestingType) {
            return false;
        }
        const MINIMATCH_OPTIONS = { dot: true, matchBase: true };
        const { specPattern = [], excludeSpecPattern = [] } = await this.ctx.project.specPatternsByTestingType(targetTestingType);
        for (const pattern of excludeSpecPattern) {
            if ((0, minimatch_1.default)(specFile, pattern, MINIMATCH_OPTIONS)) {
                return false;
            }
        }
        for (const pattern of specPattern) {
            if ((0, minimatch_1.default)(specFile, pattern, MINIMATCH_OPTIONS)) {
                return true;
            }
        }
        return false;
    }
    async destroy() {
        await this.stopSpecWatcher();
    }
    async stopSpecWatcher() {
        if (!this._specWatcher) {
            return;
        }
        await this._specWatcher.close().catch(() => { });
        this._specWatcher = null;
    }
    getCurrentSpecByAbsolute(absolute) {
        return this.ctx.project.specs.find((x) => x.absolute === absolute);
    }
    async getProjectPreferences(projectTitle) {
        var _a;
        const preferences = await this.api.getProjectPreferencesFromCache();
        return (_a = preferences[projectTitle]) !== null && _a !== void 0 ? _a : null;
    }
    async getCodeGenGlobs() {
        var _a;
        (0, assert_1.default)(this.ctx.currentProject, `Cannot find glob without currentProject.`);
        const looseComponentGlob = '*.{js,jsx,ts,tsx,vue}';
        const framework = this.ctx.actions.codegen.getWizardFrameworkFromConfig();
        return {
            component: (_a = framework === null || framework === void 0 ? void 0 : framework.glob) !== null && _a !== void 0 ? _a : looseComponentGlob,
        };
    }
    async getResolvedConfigFields() {
        var _a, _b;
        const config = (_b = (_a = this.ctx.lifecycleManager.loadedFullConfig) === null || _a === void 0 ? void 0 : _a.resolved) !== null && _b !== void 0 ? _b : {};
        const mapEnvResolvedConfigToObj = (config) => {
            return Object.entries(config).reduce((acc, [field, value]) => {
                return {
                    ...acc,
                    value: { ...acc.value, [field]: value.value },
                };
            }, {
                value: {},
                field: 'env',
                from: 'env',
            });
        };
        return Object.entries(config !== null && config !== void 0 ? config : {}).map(([key, value]) => {
            if (key === 'env' && value) {
                return mapEnvResolvedConfigToObj(value);
            }
            return { ...value, field: key };
        });
    }
    async getCodeGenCandidates(glob) {
        if (!glob.startsWith('**/')) {
            glob = `**/${glob}`;
        }
        const projectRoot = this.ctx.currentProject;
        if (!projectRoot) {
            throw Error(`Cannot find components without currentProject.`);
        }
        const codeGenCandidates = await this.ctx.file.getFilesByGlob(projectRoot, glob, { expandDirectories: true, ignore: ['**/*.config.{js,ts}', '**/*.{cy,spec}.{js,ts,jsx,tsx}'] });
        return codeGenCandidates.map((absolute) => ({ absolute }));
    }
    async getIsDefaultSpecPattern() {
        (0, assert_1.default)(this.ctx.currentProject);
        (0, assert_1.default)(this.ctx.coreData.currentTestingType);
        const { e2e, component } = config_1.defaultSpecPattern;
        const { specPattern } = await this.ctx.project.specPatterns();
        if (this.ctx.coreData.currentTestingType === 'e2e') {
            return lodash_1.default.isEqual(specPattern, [e2e]);
        }
        return lodash_1.default.isEqual(specPattern, [component]);
    }
    async maybeGetProjectId(source) {
        var _a;
        // If this is the currently active project, we can look at the project id
        if (source.projectRoot === this.ctx.currentProject) {
            return await this.projectId();
        }
        // Get the saved state & resolve the lastProjectId
        const savedState = await ((_a = source.savedState) === null || _a === void 0 ? void 0 : _a.call(source));
        if (savedState === null || savedState === void 0 ? void 0 : savedState.lastProjectId) {
            return savedState.lastProjectId;
        }
        // Otherwise, we can try to derive the projectId by reading it from the config file
        // (implement this in the future, if we ever want to display runs for a project in global mode)
        return null;
    }
}
exports.ProjectDataSource = ProjectDataSource;
_ProjectDataSource_runAllSpecs = new WeakMap();
