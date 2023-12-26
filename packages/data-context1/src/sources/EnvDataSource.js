"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnvDataSource = void 0;
/**
 * Centralizes all of the "env"
 * TODO: see if/how we might want to use this?
 */
class EnvDataSource {
    constructor(ctx) {
        this.ctx = ctx;
    }
    get isProduction() {
        return process.env.CYPRESS_INTERNAL_ENV === 'production';
    }
    get HTTP_PROXY() {
        return process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
    }
    get NO_PROXY() {
        return process.env.NO_PROXY;
    }
}
exports.EnvDataSource = EnvDataSource;
