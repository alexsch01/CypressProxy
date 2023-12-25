"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertValidPlatform = exports.SUPPORTED_PLATFORMS = void 0;
/// <reference types="node" />
exports.SUPPORTED_PLATFORMS = ['linux', 'darwin', 'win32'];
function assertValidPlatform(platform) {
    if (!exports.SUPPORTED_PLATFORMS.includes(platform)) {
        throw new Error(`Unsupported platform ${platform}, expected ${exports.SUPPORTED_PLATFORMS.join(', ')}`);
    }
}
exports.assertValidPlatform = assertValidPlatform;
