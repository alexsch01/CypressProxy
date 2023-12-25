"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DefaultTranspileCache = void 0;
/**
 * In memory transpile cache that is used if none was provided to `packherd:require`.
 */
class DefaultTranspileCache {
    constructor() {
        this._cache = new Map();
    }
    get(fullPath) {
        // In memory cache only so we don't expect anything to be stale
        return this._cache.get(fullPath);
    }
    addAsync(origFullPath, convertedContent) {
        this.add(origFullPath, convertedContent);
        return Promise.resolve();
    }
    add(origFullPath, convertedContent) {
        this._cache.set(origFullPath, convertedContent);
    }
    clearSync() {
        this._cache.clear();
    }
}
exports.DefaultTranspileCache = DefaultTranspileCache;
