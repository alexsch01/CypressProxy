"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RunSpecErrorCodeEnum = exports.RunSpecErrorCode = void 0;
const nexus_1 = require("nexus");
exports.RunSpecErrorCode = ['NO_PROJECT', 'NO_SPEC_PATH', 'NO_SPEC_PATTERN_MATCH', 'TESTING_TYPE_NOT_CONFIGURED', 'SPEC_NOT_FOUND', 'GENERAL_ERROR'];
exports.RunSpecErrorCodeEnum = (0, nexus_1.enumType)({
    name: 'RunSpecErrorCode',
    members: exports.RunSpecErrorCode,
});
