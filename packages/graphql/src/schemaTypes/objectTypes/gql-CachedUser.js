"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CachedUser = void 0;
const tslib_1 = require("tslib");
const dedent_1 = tslib_1.__importDefault(require("dedent"));
const nexus_1 = require("nexus");
exports.CachedUser = (0, nexus_1.objectType)({
    name: 'CachedUser',
    description: (0, dedent_1.default) `
    When we don't have an immediate response for the cloudViewer request, we'll use this as a fallback to 
    render the avatar in the header bar / signal authenticated state immediately
  `,
    node: 'email',
    definition(t) {
        t.string('fullName', {
            description: 'Name of the cached user',
            resolve: (source) => { var _a; return (_a = source.name) !== null && _a !== void 0 ? _a : null; },
        });
        t.string('email', {
            description: 'Email address of the cached user',
        });
    },
    sourceType: {
        export: 'AuthenticatedUserShape',
        module: '@packages/data-context/src/data/coreDataShape',
    },
});
