"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorActions = void 0;
class ErrorActions {
    constructor(ctx) {
        this.ctx = ctx;
    }
    /**
     * Finds the error from the different possible locations where an can be stored,
     * and nulls it out
     */
    clearError(id) {
        this.ctx.update((d) => {
            var _a;
            if (((_a = d.diagnostics.error) === null || _a === void 0 ? void 0 : _a.id) === id) {
                d.diagnostics.error = null;
            }
        });
    }
    /**
     * Finds the warning from the different possible locations where warnings can be stored,
     * and removes it from the array
     */
    clearWarning(id) {
        this.ctx.update((d) => {
            const warningsIndex = d.diagnostics.warnings.findIndex((v) => v.id === id);
            if (warningsIndex !== -1) {
                d.diagnostics.warnings.splice(warningsIndex, 1);
            }
        });
    }
}
exports.ErrorActions = ErrorActions;
