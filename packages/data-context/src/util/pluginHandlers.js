"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetPluginHandlers = exports.registerServerPluginHandler = exports.getServerPluginHandlers = void 0;
let pluginHandlers = [];
const getServerPluginHandlers = () => {
    return pluginHandlers;
};
exports.getServerPluginHandlers = getServerPluginHandlers;
const registerServerPluginHandler = (handler) => {
    pluginHandlers.push(handler);
};
exports.registerServerPluginHandler = registerServerPluginHandler;
const resetPluginHandlers = () => {
    pluginHandlers = [];
};
exports.resetPluginHandlers = resetPluginHandlers;
