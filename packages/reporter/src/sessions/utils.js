"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.determineTagType = void 0;
function determineTagType(state) {
    switch (state) {
        case 'failed':
            return 'failed-status';
        case 'warned':
            return 'warned-status';
        default:
            return 'successful-status';
    }
}
exports.determineTagType = determineTagType;
