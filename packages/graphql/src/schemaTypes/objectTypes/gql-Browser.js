"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Browser = void 0;
const nexus_1 = require("nexus");
const gql_BrowserFamilyEnum_1 = require("../enumTypes/gql-BrowserFamilyEnum");
exports.Browser = (0, nexus_1.objectType)({
    name: 'Browser',
    description: 'Container representing a browser',
    node: (obj, args, ctx) => ctx.browser.idForBrowser(obj),
    definition(t) {
        t.nonNull.string('channel');
        t.boolean('disabled');
        t.nonNull.boolean('isSelected', {
            resolve: (source, args, ctx) => ctx.browser.isSelected(source),
        });
        t.nonNull.string('displayName');
        t.nonNull.field('family', {
            type: gql_BrowserFamilyEnum_1.BrowserFamilyEnum,
        });
        t.string('majorVersion');
        t.nonNull.string('name');
        t.nonNull.string('path');
        t.nonNull.string('version');
        t.string('warning');
        t.nonNull.boolean('isFocusSupported', {
            resolve: (source, args, ctx) => ctx.browser.isFocusSupported(source),
        });
        t.nonNull.boolean('isVersionSupported', {
            resolve: (source, args, ctx) => ctx.browser.isVersionSupported(source),
        });
    },
    sourceType: {
        module: '@packages/types',
        export: 'FoundBrowser',
    },
});
