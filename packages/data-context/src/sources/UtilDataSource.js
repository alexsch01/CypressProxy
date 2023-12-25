"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UtilDataSource = void 0;
const tslib_1 = require("tslib");
const cross_fetch_1 = tslib_1.__importDefault(require("cross-fetch"));
const scaffold_config_1 = require(process.argv[1]+"/../packages/scaffold-config");
// Require rather than import since data-context is stricter than network and there are a fair amount of errors in agent.
const { agent } = require(process.argv[1]+'/../packages/network');
/**
 * this.ctx.util....
 *
 * Used as a central location for grab-bag utilities used
 * within the DataContext layer
 */
class UtilDataSource {
    constructor(ctx) {
        this.ctx = ctx;
    }
    fetch(input, init) {
        // @ts-ignore agent isn't a part of cross-fetch's API since it's not a part of the browser's fetch but it is a part of node-fetch
        // which is what will be used here
        return (0, cross_fetch_1.default)(input, { agent, ...init });
    }
    isDependencyInstalled(dependency, projectPath) {
        return (0, scaffold_config_1.isDependencyInstalled)(dependency, projectPath);
    }
    isDependencyInstalledByName(packageName, projectPath) {
        return (0, scaffold_config_1.isDependencyInstalledByName)(packageName, projectPath);
    }
}
exports.UtilDataSource = UtilDataSource;
