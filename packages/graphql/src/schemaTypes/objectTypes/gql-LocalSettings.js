"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocalSettings = exports.LocalSettingsPreferences = void 0;
const nexus_1 = require("nexus");
const gql_Editor_1 = require("./gql-Editor");
exports.LocalSettingsPreferences = (0, nexus_1.objectType)({
    name: 'LocalSettingsPreferences',
    description: 'local setting preferences',
    definition(t) {
        t.boolean('autoScrollingEnabled');
        t.string('preferredEditorBinary');
        t.boolean('isSpecsListOpen');
        t.int('reporterWidth');
        t.int('specListWidth');
        t.boolean('isSideNavigationOpen');
        t.string('proxyServer', {
            resolve: (source, args, ctx) => { var _a; return (_a = ctx.env.HTTP_PROXY) !== null && _a !== void 0 ? _a : null; },
        });
        t.string('proxyBypass', {
            resolve: (source, args, ctx) => { var _a; return (_a = ctx.env.NO_PROXY) !== null && _a !== void 0 ? _a : null; },
        });
        t.json('majorVersionWelcomeDismissed', {
            resolve: async (source, args, ctx) => {
                const preferences = await ctx._apis.localSettingsApi.getPreferences();
                return preferences.majorVersionWelcomeDismissed || {};
            },
        });
        t.boolean('wasBrowserSetInCLI', {
            resolve: (source, args, ctx) => {
                return Boolean(ctx.coreData.cliBrowser);
            },
        });
        t.boolean('debugSlideshowComplete');
        t.boolean('desktopNotificationsEnabled');
        t.dateTime('dismissNotificationBannerUntil');
        t.boolean('notifyWhenRunStarts');
        t.boolean('notifyWhenRunStartsFailing');
        t.json('notifyWhenRunCompletes', {
            resolve: async (source, args, ctx) => {
                return ctx.coreData.localSettings.preferences.notifyWhenRunCompletes || [];
            },
        });
    },
});
exports.LocalSettings = (0, nexus_1.objectType)({
    name: 'LocalSettings',
    description: 'local settings on a device-by-device basis',
    definition(t) {
        t.nonNull.list.nonNull.field('availableEditors', {
            type: gql_Editor_1.Editor,
        });
        t.nonNull.field('preferences', {
            type: exports.LocalSettingsPreferences,
        });
    },
});
