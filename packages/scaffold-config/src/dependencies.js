"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dependencyNamesToDetect = exports.WIZARD_BUNDLERS = exports.WIZARD_DEPENDENCIES = exports.WIZARD_DEPENDENCY_SVELTE = exports.WIZARD_DEPENDENCY_ANGULAR_PLATFORM_BROWSER_DYNAMIC = exports.WIZARD_DEPENDENCY_ANGULAR_COMMON = exports.WIZARD_DEPENDENCY_ANGULAR_CORE = exports.WIZARD_DEPENDENCY_ANGULAR_DEVKIT_BUILD_ANGULAR = exports.WIZARD_DEPENDENCY_ANGULAR_CLI = exports.WIZARD_DEPENDENCY_NEXT = exports.WIZARD_DEPENDENCY_NUXT = exports.WIZARD_DEPENDENCY_VITE = exports.WIZARD_DEPENDENCY_VUE_CLI_SERVICE = exports.WIZARD_DEPENDENCY_REACT_SCRIPTS = exports.WIZARD_DEPENDENCY_TYPESCRIPT = exports.WIZARD_DEPENDENCY_REACT_DOM = exports.WIZARD_DEPENDENCY_REACT = exports.WIZARD_DEPENDENCY_VUE_3 = exports.WIZARD_DEPENDENCY_VUE_2 = exports.WIZARD_DEPENDENCY_WEBPACK = void 0;
exports.WIZARD_DEPENDENCY_WEBPACK = {
    type: 'webpack',
    name: 'Webpack',
    package: 'webpack',
    installer: 'webpack',
    description: 'Webpack is a module bundler',
    minVersion: '^4.0.0 || ^5.0.0',
};
exports.WIZARD_DEPENDENCY_VUE_2 = {
    type: 'vue',
    name: 'Vue.js 2',
    package: 'vue',
    installer: 'vue@2',
    description: 'The Progressive JavaScript Framework',
    minVersion: '^2.0.0',
};
exports.WIZARD_DEPENDENCY_VUE_3 = {
    type: 'vue',
    name: 'Vue.js 3',
    package: 'vue',
    installer: 'vue',
    description: 'The Progressive JavaScript Framework',
    minVersion: '^3.0.0',
};
exports.WIZARD_DEPENDENCY_REACT = {
    type: 'react',
    name: 'React.js',
    package: 'react',
    installer: 'react',
    description: 'A JavaScript library for building user interfaces',
    minVersion: '^16.0.0 || ^17.0.0 || ^18.0.0',
};
exports.WIZARD_DEPENDENCY_REACT_DOM = {
    type: 'react-dom',
    name: 'React DOM',
    package: 'react-dom',
    installer: 'react-dom',
    description: 'This package serves as the entry point to the DOM and server renderers for React',
    minVersion: '^16.0.0 || ^17.0.0 || ^18.0.0',
};
exports.WIZARD_DEPENDENCY_TYPESCRIPT = {
    type: 'typescript',
    name: 'TypeScript',
    package: 'typescript',
    installer: 'typescript',
    description: 'TypeScript is a language for application-scale JavaScript',
    minVersion: '^3.4.0 || ^4.0.0 || ^5.0.0',
};
exports.WIZARD_DEPENDENCY_REACT_SCRIPTS = {
    type: 'reactscripts',
    name: 'React Scripts',
    package: 'react-scripts',
    installer: 'react-scripts',
    description: 'Create React apps with no build configuration',
    minVersion: '^4.0.0 || ^5.0.0',
};
exports.WIZARD_DEPENDENCY_VUE_CLI_SERVICE = {
    type: 'vuecliservice',
    name: 'Vue CLI',
    package: '@vue/cli-service',
    installer: '@vue/cli-service',
    description: 'Standard Tooling for Vue.js Development',
    minVersion: '^4.0.0 || ^5.0.0',
};
exports.WIZARD_DEPENDENCY_VITE = {
    type: 'vite',
    name: 'Vite',
    package: 'vite',
    installer: 'vite',
    description: 'Vite is dev server that serves your source files over native ES modules',
    minVersion: '^2.0.0 || ^3.0.0 || ^4.0.0',
};
exports.WIZARD_DEPENDENCY_NUXT = {
    type: 'nuxt',
    name: 'Nuxt',
    package: 'nuxt',
    installer: 'nuxt@2',
    description: 'The Intuitive Vue Framework',
    minVersion: '^2.0.0',
};
exports.WIZARD_DEPENDENCY_NEXT = {
    type: 'next',
    name: 'Next',
    package: 'next',
    installer: 'next',
    description: 'The React Framework for Production',
    minVersion: '^10.0.0 || ^11.0.0 || ^12.0.0 || ^13.0.0',
};
exports.WIZARD_DEPENDENCY_ANGULAR_CLI = {
    type: 'angular',
    name: 'Angular CLI',
    package: '@angular/cli',
    installer: '@angular/cli',
    description: 'CLI tool that you use to initialize, develop, scaffold, and maintain Angular applications.',
    minVersion: '^13.0.0 || ^14.0.0 || ^15.0.0 || ^16.0.0 || ^17.0.0',
};
exports.WIZARD_DEPENDENCY_ANGULAR_DEVKIT_BUILD_ANGULAR = {
    type: 'angular',
    name: 'Angular DevKit Build Angular',
    package: '@angular-devkit/build-angular',
    installer: '@angular-devkit/build-angular',
    description: 'Angular Webpack build facade',
    minVersion: '^13.0.0 || ^14.0.0 || ^15.0.0 || ^16.0.0 || ^17.0.0',
};
exports.WIZARD_DEPENDENCY_ANGULAR_CORE = {
    type: 'angular',
    name: 'Angular Core',
    package: '@angular/core',
    installer: '@angular/core',
    description: 'The core of the Angular framework',
    minVersion: '^13.0.0 || ^14.0.0 || ^15.0.0 || ^16.0.0 || ^17.0.0',
};
exports.WIZARD_DEPENDENCY_ANGULAR_COMMON = {
    type: 'angular',
    name: 'Angular Common',
    package: '@angular/common',
    installer: '@angular/common',
    description: 'Commonly needed Angular directives and services',
    minVersion: '^13.0.0 || ^14.0.0 || ^15.0.0 || ^16.0.0 || ^17.0.0',
};
exports.WIZARD_DEPENDENCY_ANGULAR_PLATFORM_BROWSER_DYNAMIC = {
    type: 'angular',
    name: 'Angular Platform Browser Dynamic',
    package: '@angular/platform-browser-dynamic',
    installer: '@angular/platform-browser-dynamic',
    description: 'Library for using Angular in a web browser with JIT compilation',
    minVersion: '^13.0.0 || ^14.0.0 || ^15.0.0 || ^16.0.0 || ^17.0.0',
};
exports.WIZARD_DEPENDENCY_SVELTE = {
    type: 'svelte',
    name: 'Svelte.js',
    package: 'svelte',
    installer: 'svelte',
    description: 'Cybernetically enhanced web apps',
    minVersion: '^3.0.0 || ^4.0.0',
};
exports.WIZARD_DEPENDENCIES = [
    exports.WIZARD_DEPENDENCY_WEBPACK,
    exports.WIZARD_DEPENDENCY_TYPESCRIPT,
    exports.WIZARD_DEPENDENCY_REACT_SCRIPTS,
    exports.WIZARD_DEPENDENCY_VUE_CLI_SERVICE,
    exports.WIZARD_DEPENDENCY_VITE,
    exports.WIZARD_DEPENDENCY_NUXT,
    exports.WIZARD_DEPENDENCY_NEXT,
    exports.WIZARD_DEPENDENCY_REACT,
    exports.WIZARD_DEPENDENCY_REACT_DOM,
    exports.WIZARD_DEPENDENCY_VUE_2,
    exports.WIZARD_DEPENDENCY_VUE_3,
    exports.WIZARD_DEPENDENCY_ANGULAR_CLI,
    exports.WIZARD_DEPENDENCY_ANGULAR_DEVKIT_BUILD_ANGULAR,
    exports.WIZARD_DEPENDENCY_ANGULAR_CORE,
    exports.WIZARD_DEPENDENCY_ANGULAR_COMMON,
    exports.WIZARD_DEPENDENCY_ANGULAR_PLATFORM_BROWSER_DYNAMIC,
    exports.WIZARD_DEPENDENCY_SVELTE,
];
exports.WIZARD_BUNDLERS = [
    exports.WIZARD_DEPENDENCY_WEBPACK,
    exports.WIZARD_DEPENDENCY_VITE,
];
const componentDependenciesOfInterest = [
    '@angular/cli',
    '@angular-devkit/build-angular',
    '@angular/core',
    '@angular/common',
    '@angular/platform-browser-dynamic',
    'react',
    'react-dom',
    'react-scripts',
    'vue',
    '@vue/cli-service',
    'svelte',
    'solid-js',
    'lit',
    'preact',
    'preact-cli',
    'ember',
    '@stencil/core',
    '@builder.io/qwik',
    'alpinejs',
    '@glimmer/component',
    'typescript',
];
const bundlerDependenciesOfInterest = [
    'vite',
    'webpack',
    'parcel',
    'rollup',
    'snowpack',
];
const testingDependenciesOfInterest = [
    'jest',
    'jsdom',
    'jest-preview',
    'storybook',
    '@storybook/addon-interactions',
    '@storybook/addon-a11y',
    'chromatic',
    '@testing-library/react',
    '@testing-library/react-hooks',
    '@testing-library/dom',
    '@testing-library/jest-dom',
    '@testing-library/cypress',
    '@testing-library/user-event',
    '@testing-library/vue',
    '@testing-library/svelte',
    '@testing-library/preact',
    'happy-dom',
    'vitest',
    'vitest-preview',
    'selenium-webdriver',
    'nightwatch',
    'karma',
    'playwright',
    'playwright-core',
    '@playwright/experimental-ct-core',
    '@playwright/experimental-ct-react',
    '@playwright/experimental-ct-svelte',
    '@playwright/experimental-ct-vue',
    '@playwright/experimental-ct-vue2',
    '@playwright/experimental-ct-solid',
    '@playwright/experimental-ct-react17',
    'axe-core',
    'jest-axe',
    'enzyme',
];
exports.dependencyNamesToDetect = [
    ...componentDependenciesOfInterest,
    ...bundlerDependenciesOfInterest,
    ...testingDependenciesOfInterest,
];
