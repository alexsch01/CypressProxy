"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpecTypeEnum = exports.SPEC_TYPE = void 0;
const nexus_1 = require("nexus");
exports.SPEC_TYPE = ['component', 'integration'];
exports.SpecTypeEnum = (0, nexus_1.enumType)({
    name: 'SpecType',
    members: exports.SPEC_TYPE,
});
