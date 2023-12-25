"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DevState = void 0;
const tslib_1 = require("tslib");
const lodash_1 = tslib_1.__importDefault(require("lodash"));
const nexus_1 = require("nexus");
const toExpand = new Set(['ProjectLifecycleManager']);
exports.DevState = (0, nexus_1.objectType)({
    name: 'DevState',
    description: 'State associated/helpful for local development of Cypress',
    definition(t) {
        t.json('state', {
            description: 'For debugging, the current application state',
            resolve: (source, args, ctx) => {
                function replacer(key, val) {
                    if (val && !Array.isArray(val) && lodash_1.default.isObject(val) && !lodash_1.default.isPlainObject(val)) {
                        if (toExpand.has(val.constructor.name)) {
                            return val;
                        }
                        return `[${val.constructor.name}]`;
                    }
                    return val;
                }
                return {
                    coreData: JSON.parse(JSON.stringify(ctx.coreData, replacer)),
                    modeOptions: ctx.modeOptions,
                    lifecycleManager: JSON.parse(JSON.stringify(ctx.lifecycleManager, replacer)),
                };
            },
        });
        t.boolean('needsRelaunch', {
            description: 'When we have edited server related files, we may want to relaunch the client.',
            resolve(source, args, ctx) {
                return Boolean(source.refreshState);
            },
        });
    },
    sourceType: {
        module: '@packages/data-context/src/data/coreDataShape',
        export: 'DevStateShape',
    },
});
