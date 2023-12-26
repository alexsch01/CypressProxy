"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpecOptions = exports.expectedSpecExtensions = void 0;
const tslib_1 = require("tslib");
const fs_extra_1 = tslib_1.__importDefault(require("fs-extra"));
const lodash_1 = require("lodash");
const path_1 = tslib_1.__importDefault(require("path"));
const utils_1 = require("../sources/migration/utils");
const util_1 = require("../util");
// Spec file extensions that we will preserve when updating the file name
// due the existence of duplicate files.
//
// Example:
//   Button.cy.ts   -> Button-copy-1.cy.ts
//   Button_spec.js -> Button-copy-1_spec.js
//   Button.foo.js  -> Button.foo-copy-1.js
exports.expectedSpecExtensions = ['.cy', '.spec', '.test', '-spec', '-test', '_spec'];
class SpecOptions {
    constructor(options) {
        this.options = options;
        this.getSpecExtension = (filePath) => {
            const foundSpecExtension = exports.expectedSpecExtensions.find((specExtension) => {
                return filePath ? filePath.base.endsWith(specExtension + filePath.ext) :
                    this.parsedPath.base.endsWith(specExtension + this.parsedPath.ext);
            });
            return foundSpecExtension || '';
        };
        this.parsedPath = path_1.default.parse(options.codeGenPath);
    }
    async getCodeGenOptions() {
        if (this.options.codeGenType === 'component') {
            return this.getComponentCodeGenOptions();
        }
        return {
            codeGenType: this.options.codeGenType,
            fileName: await this.buildFileName(),
            templateKey: this.options.codeGenType,
            overrideCodeGenDir: '',
        };
    }
    async getComponentCodeGenOptions() {
        if (!this.options.framework) {
            throw new Error('Cannot generate a spec without a framework');
        }
        switch (this.options.framework.codeGenFramework) {
            case 'react':
                return await this.getReactSpecOptions();
            case 'vue':
                return await this.getVueSpecOptions();
            default:
                throw new Error(`Unable to generate spec for ${this.options.framework.codeGenFramework}`);
        }
    }
    getRelativePathToComponent(specParsedPath) {
        if (specParsedPath) {
            const componentPathRelative = path_1.default.relative(specParsedPath.dir, this.parsedPath.dir);
            const componentPath = path_1.default.join(componentPathRelative, this.parsedPath.base);
            return (0, util_1.toPosix)(componentPath.startsWith('.') ? componentPath : `./${componentPath}`);
        }
        return `./${this.parsedPath.base}`;
    }
    async getVueSpecOptions() {
        const componentName = this.buildComponentNameFromFilename(this.parsedPath.name);
        const extension = await this.getVueExtension();
        let parsedSpecPath;
        // If we have a custom spec pattern, write the spec to a path that matches the pattern instead of the component directory
        if (!this.options.isDefaultSpecPattern) {
            parsedSpecPath = path_1.default.parse(await (0, utils_1.getDefaultSpecFileName)({
                currentProject: this.options.currentProject,
                testingType: 'component',
                fileExtensionToUse: (extension === '.cy.ts' || extension === '.cy.tsx') ? 'ts' : 'js',
                specPattern: this.options.specPattern,
                name: componentName,
                specs: this.options.specs
            }));
        }
        // The path to import the component from
        const componentPath = this.getRelativePathToComponent(parsedSpecPath);
        return {
            codeGenType: this.options.codeGenType,
            componentName,
            componentPath,
            fileName: await this.buildComponentSpecFilename(extension, parsedSpecPath),
            templateKey: 'vueComponent',
            overrideCodeGenDir: parsedSpecPath === null || parsedSpecPath === void 0 ? void 0 : parsedSpecPath.dir,
        };
    }
    async getReactSpecOptions() {
        // For React specs, use the component name that the user selected. Otherwise fall back to the component file name.
        const componentName = this.options.componentName || this.parsedPath.name;
        let parsedSpecPath;
        // If we have a custom spec pattern, write the spec to a path that matches the pattern instead of the component directory
        if (!this.options.isDefaultSpecPattern) {
            parsedSpecPath = path_1.default.parse(await (0, utils_1.getDefaultSpecFileName)({
                currentProject: this.options.currentProject,
                testingType: 'component',
                fileExtensionToUse: this.parsedPath.ext,
                specPattern: this.options.specPattern,
                name: componentName,
                specs: this.options.specs
            }));
        }
        // The path to import the component from
        const componentPath = path_1.default.parse(this.getRelativePathToComponent(parsedSpecPath));
        const extension = `.cy${this.parsedPath.ext}`;
        return {
            codeGenType: this.options.codeGenType,
            componentName,
            componentPath: `${componentPath.dir}/${componentPath.name}`,
            // If the component name and file name are different, the spec file should be combined (ex: SpecNameComponentName.cy.xx)
            fileName: await this.buildComponentSpecFilename(extension, parsedSpecPath, (0, lodash_1.uniq)([this.parsedPath.name, componentName]).join('')),
            templateKey: 'reactComponent',
            overrideCodeGenDir: parsedSpecPath === null || parsedSpecPath === void 0 ? void 0 : parsedSpecPath.dir,
            isDefault: this.options.isDefault,
        };
    }
    async getVueExtension() {
        try {
            const fileContent = await fs_extra_1.default
                .readFile(this.options.codeGenPath, 'utf8');
            return ['lang="ts"', 'lang="typescript"'].some((lang) => fileContent.includes(lang)) ? '.cy.ts' : '.cy.js';
        }
        catch (e) {
            const validExtensions = ['cy.js', '.cy.jsx', '.cy.ts', '.cy.tsx'];
            const possibleExtension = this.parsedPath.ext;
            if (validExtensions.includes(possibleExtension)) {
                return possibleExtension;
            }
            return '.cy.js';
        }
    }
    buildComponentNameFromFilename(fileNameWithoutExt) {
        const sanitizedName = fileNameWithoutExt
            // Remove any characters from the filename that aren't allowed within a JS variable name (but leave periods and hyphens)
            .replaceAll(/[^a-z_\d$.-]/gi, '')
            // Remove any groupings of multiple periods (eg, '...all') but leave single periods alone
            .replaceAll(/[.]{2,}/g, '');
        // Convert period- and hyphen-delimited portions to PascalCase
        // eg, 'test.page.ts' => 'TestPage', 'about.component.vue' => 'AboutComponent'
        return sanitizedName.split(/[-.]/g)
            .map(lodash_1.upperFirst)
            .join('');
    }
    buildComponentSpecFilename(specExt, filePath, fileName) {
        const { dir, base, ext } = filePath || this.parsedPath;
        const cyWithExt = this.getSpecExtension(filePath) + ext;
        const name = fileName || base.slice(0, -cyWithExt.length);
        const finalExtension = filePath ? cyWithExt : specExt;
        return this.getFinalFileName(dir, name, finalExtension, path_1.default.join(dir, `${name}${finalExtension}`));
    }
    async buildFileName() {
        const { dir, base, ext } = this.parsedPath;
        const cyWithExt = this.getSpecExtension() + ext;
        const name = base.slice(0, -cyWithExt.length);
        return this.getFinalFileName(dir, name, cyWithExt, path_1.default.join(dir, `${name}${cyWithExt}`));
    }
    async getFinalFileName(dir, name, cyWithExt, fileToTry) {
        // At this point, for a filePath of `/foo/bar/baz.cy.js`
        // - name = `baz`
        // - cyWithExt = `.cy.js`
        let finalFileName = fileToTry;
        let i = 0;
        while (await this.fileExists(finalFileName)) {
            finalFileName = path_1.default.join(dir, `${name}-copy-${++i}${cyWithExt}`);
        }
        return path_1.default.parse(finalFileName).base;
    }
    async fileExists(absolute) {
        try {
            await fs_extra_1.default.access(absolute, fs_extra_1.default.constants.F_OK);
            return true;
        }
        catch (e) {
            return false;
        }
    }
}
exports.SpecOptions = SpecOptions;
