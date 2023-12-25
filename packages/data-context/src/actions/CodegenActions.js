"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CodegenActions = void 0;
const tslib_1 = require("tslib");
const assert_1 = tslib_1.__importDefault(require("assert"));
const path_1 = tslib_1.__importDefault(require("path"));
const codegen_1 = require("../codegen");
const templates_1 = tslib_1.__importDefault(require("../codegen/templates"));
const ast_types_1 = require("ast-types");
class CodegenActions {
    constructor(ctx) {
        this.ctx = ctx;
    }
    async getReactComponentsFromFile(filePath, reactDocgen) {
        try {
            // this dance to get react-docgen is for now because react-docgen is a module and our typescript settings are set up to transpile to commonjs
            // which will require the module, which will fail because it's an es module. This is a temporary workaround.
            let actualReactDocgen = reactDocgen;
            if (!actualReactDocgen) {
                actualReactDocgen = await Promise.resolve().then(() => tslib_1.__importStar(require('react-docgen')));
            }
            const { parse: parseReactComponent, builtinResolvers: reactDocgenResolvers } = actualReactDocgen;
            const src = await this.ctx.fs.readFile(filePath, 'utf8');
            const exportResolver = new Map();
            let result = parseReactComponent(src, {
                resolver: findAllWithLink(exportResolver, reactDocgenResolvers),
                babelOptions: {
                    parserOpts: {
                        plugins: ['typescript', 'jsx'],
                    },
                },
            });
            // types appear to be incorrect in react-docgen@6.0.0-alpha.3
            // TODO: update when 6.0.0 stable is out for fixed types.
            const defs = (Array.isArray(result) ? result : [result]);
            const resolvedDefs = defs.reduce((acc, descriptor) => {
                const displayName = descriptor.displayName || '';
                const resolved = exportResolver.get(displayName);
                // Limitation of resolving an export to a detected react component means we will filter out
                // some valid components, but trying to generate them without knowing what the exportName is or
                // if it is a default export will lead to bugs
                if (resolved) {
                    acc.push(resolved);
                }
                return acc;
            }, []);
            return { components: resolvedDefs };
        }
        catch (err) {
            this.ctx.debug(err);
            // react-docgen throws an error if it doesn't find any components in a file.
            // This is okay for our purposes, so if this is the error, catch it and return [].
            if (err.message === 'No suitable component definition found.') {
                return { components: [] };
            }
            return { errored: true, components: [] };
        }
    }
    async codeGenSpec(codeGenCandidate, codeGenType, componentName, isDefault) {
        var _a, _b;
        const project = this.ctx.currentProject;
        (0, assert_1.default)(project, 'Cannot create spec without currentProject.');
        const getCodeGenPath = () => {
            return codeGenType === 'e2e'
                ? this.ctx.path.join(project, codeGenCandidate)
                : codeGenCandidate;
        };
        const codeGenPath = getCodeGenPath();
        const { specPattern = [] } = await this.ctx.project.specPatterns();
        const newSpecCodeGenOptions = new codegen_1.SpecOptions({
            codeGenPath,
            codeGenType,
            framework: this.getWizardFrameworkFromConfig(),
            isDefaultSpecPattern: await this.ctx.project.getIsDefaultSpecPattern(),
            specPattern,
            currentProject: this.ctx.currentProject,
            specs: this.ctx.project.specs,
            componentName,
            isDefault,
        });
        let codeGenOptions = await newSpecCodeGenOptions.getCodeGenOptions();
        const codeGenResults = await (0, codegen_1.codeGenerator)({ templateDir: templates_1.default[codeGenOptions.templateKey], target: codeGenOptions.overrideCodeGenDir || path_1.default.parse(codeGenPath).dir }, codeGenOptions);
        if (!codeGenResults.files[0] || codeGenResults.failed[0]) {
            throw (codeGenResults.failed[0] || 'Unable to generate spec');
        }
        const [newSpec] = codeGenResults.files;
        const cfg = await this.ctx.project.getConfig();
        if (cfg && this.ctx.currentProject) {
            const testingType = (codeGenType === 'component') ? 'component' : 'e2e';
            await this.ctx.actions.project.setSpecsFoundBySpecPattern({
                projectRoot: this.ctx.currentProject,
                testingType,
                specPattern: (_a = cfg.specPattern) !== null && _a !== void 0 ? _a : [],
                configSpecPattern: (_b = cfg.specPattern) !== null && _b !== void 0 ? _b : [],
                excludeSpecPattern: cfg.excludeSpecPattern,
                additionalIgnorePattern: cfg.additionalIgnorePattern,
            });
        }
        return {
            status: 'valid',
            file: { absolute: newSpec.file, contents: newSpec.content },
            description: 'Generated spec',
        };
    }
    get defaultE2EPath() {
        const projectRoot = this.ctx.currentProject;
        (0, assert_1.default)(projectRoot, `Cannot create e2e directory without currentProject.`);
        return path_1.default.join(projectRoot, 'cypress', 'e2e');
    }
    async e2eExamples() {
        const projectRoot = this.ctx.currentProject;
        (0, assert_1.default)(projectRoot, `Cannot create spec without currentProject.`);
        const results = await (0, codegen_1.codeGenerator)({ templateDir: templates_1.default['e2eExamples'], target: this.defaultE2EPath }, {});
        if (results.failed.length) {
            throw new Error(`Failed generating files: ${results.failed.map((e) => `${e}`)}`);
        }
        return results.files.map(({ status, file, content }) => {
            return {
                status: (status === 'add' || status === 'overwrite') ? 'valid' : 'skipped',
                file: { absolute: file, contents: content },
                description: 'Generated spec',
            };
        });
    }
    getWizardFrameworkFromConfig() {
        var _a, _b;
        const config = this.ctx.lifecycleManager.loadedConfigFile;
        // If devServer is a function, they are using a custom dev server.
        if (!((_a = config === null || config === void 0 ? void 0 : config.component) === null || _a === void 0 ? void 0 : _a.devServer) || typeof ((_b = config === null || config === void 0 ? void 0 : config.component) === null || _b === void 0 ? void 0 : _b.devServer) === 'function') {
            return undefined;
        }
        // @ts-ignore - because of the conditional above, we know that devServer isn't a function
        return this.ctx.coreData.wizard.frameworks.find((framework) => { var _a; return framework.configFramework === ((_a = config === null || config === void 0 ? void 0 : config.component) === null || _a === void 0 ? void 0 : _a.devServer.framework); });
    }
}
exports.CodegenActions = CodegenActions;
function findAllWithLink(exportResolver, reactDocgenResolvers) {
    return (fileState) => {
        (0, ast_types_1.visit)(fileState.ast, {
            // export const Foo, export { Foo, Bar }, export function FooBar () { ... }
            visitExportNamedDeclaration: (path) => {
                var _a;
                const declaration = path.node.declaration;
                if (declaration) { // export const Foo
                    if (declaration.id) {
                        exportResolver.set(declaration.id.name, { exportName: declaration.id.name, isDefault: false });
                    }
                    else { // export const Foo, Bar
                        path.node.declaration.declarations.forEach((node) => {
                            var _a, _b;
                            const id = (_a = node.name) !== null && _a !== void 0 ? _a : (_b = node.id) === null || _b === void 0 ? void 0 : _b.name;
                            if (id) {
                                exportResolver.set(id, { exportName: id, isDefault: false });
                            }
                        });
                    }
                }
                else { // export { Foo, Bar }
                    (_a = path.node.specifiers) === null || _a === void 0 ? void 0 : _a.forEach((node) => {
                        var _a, _b;
                        if (!((_a = node.local) === null || _a === void 0 ? void 0 : _a.name)) {
                            return;
                        }
                        if (((_b = node.exported) === null || _b === void 0 ? void 0 : _b.name) === 'default') { // export { Foo as default }
                            exportResolver.set(node.local.name, {
                                exportName: node.local.name,
                                isDefault: true,
                            });
                        }
                        else {
                            exportResolver.set(node.local.name, {
                                exportName: node.exported.name,
                                isDefault: false,
                            });
                        }
                    });
                }
                return false;
            },
            // export default Foo
            visitExportDefaultDeclaration: (path) => {
                var _a;
                const declaration = path.node.declaration;
                const id = declaration.name || ((_a = declaration.id) === null || _a === void 0 ? void 0 : _a.name);
                if (id) { // export default Foo
                    exportResolver.set(id, {
                        exportName: id,
                        isDefault: true,
                    });
                }
                else { // export default () => {}
                    exportResolver.set('', {
                        exportName: 'Component',
                        isDefault: true,
                    });
                }
                return false;
            },
        });
        const exportedDefinitionsResolver = new reactDocgenResolvers.FindExportedDefinitionsResolver();
        return exportedDefinitionsResolver.resolve(fileState);
    };
}
