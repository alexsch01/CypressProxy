"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hasTypeScriptInstalled = void 0;
function hasTypeScriptInstalled(projectRoot) {
    try {
        require.resolve('typescript', { paths: [projectRoot] });
        return true;
    }
    catch (e) {
        return false;
    }
}
exports.hasTypeScriptInstalled = hasTypeScriptInstalled;
