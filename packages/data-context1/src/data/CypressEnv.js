"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CypressEnv = void 0;
const tslib_1 = require("tslib");
const fs_extra_1 = tslib_1.__importDefault(require("fs-extra"));
const errors_1 = require(process.argv[1]+"/../packages/errors");
class CypressEnv {
    constructor(options) {
        this.options = options;
    }
    async loadCypressEnvFile() {
        return this.readAndValidateCypressEnvFile();
    }
    async readAndValidateCypressEnvFile() {
        const cypressEnv = await this.readCypressEnvFile();
        this.options.validateConfigFile(this.options.envFilePath, cypressEnv);
        return cypressEnv;
    }
    async readCypressEnvFile() {
        try {
            return await fs_extra_1.default.readJSON(this.options.envFilePath);
        }
        catch (err) {
            if (err.code === 'ENOENT') {
                return {};
            }
            if (err.isCypressErr) {
                throw err;
            }
            throw (0, errors_1.getError)('ERROR_READING_FILE', this.options.envFilePath, err);
        }
    }
}
exports.CypressEnv = CypressEnv;
