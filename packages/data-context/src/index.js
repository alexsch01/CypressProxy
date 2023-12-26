"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setCtx = exports.getCtx = exports.hasCtx = exports.clearCtx = exports.globalPubSub = exports.DataContext = exports.DocumentNodeBuilder = void 0;
const tslib_1 = require("tslib");
var DocumentNodeBuilder_1 = require("./util/DocumentNodeBuilder");
Object.defineProperty(exports, "DocumentNodeBuilder", { enumerable: true, get: function () { return DocumentNodeBuilder_1.DocumentNodeBuilder; } });
Object.defineProperty(exports, "DataContext", { enumerable: true, get: function () { return null; } });
tslib_1.__exportStar(require("./util/pluginHandlers"), exports);
var globalPubSub_1 = require("./globalPubSub");
Object.defineProperty(exports, "globalPubSub", { enumerable: true, get: function () { return globalPubSub_1.globalPubSub; } });
let ctx = null;
async function clearCtx() {
    if (ctx) {
        await ctx.lifecycleManager.mainProcessWillDisconnect();
        await ctx.destroy();
        ctx = null;
    }
}
exports.clearCtx = clearCtx;
function hasCtx() {
    return Boolean(ctx);
}
exports.hasCtx = hasCtx;
/**
 * Gets the current DataContext, used in situations where it's too much work
 * to inject it deeply through the class hierarchy in legacy server code, but we
 * need to reference it anyway, and for the time being we can assume
 * there's only one for the lifecycle of the Electron app.
 */
function getCtx() {
    if (!ctx) {
        throw new Error(`
      Expected DataContext to already have been set via setCtx. If this is a
      testing context, make sure you are calling "setCtx" in a before hook,
      otherwise check the application flow.
    `);
    }
    return ctx;
}
exports.getCtx = getCtx;
/**
 * Sets the current DataContext - happens at runtime when we startup Cypress
 * in "open" / "run" mode, or during testing in a beforeEach, when we clear the context
 */
function setCtx(_ctx) {
    if (ctx) {
        throw new Error(`
      The context has already been set. If this is occurring in a testing context,
      make sure you are clearing the context. Otherwise
    `);
    }
    ctx = _ctx;
    return _ctx;
}
exports.setCtx = setCtx;
