"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CodeGenTypeEnum = void 0;
const nexus_1 = require("nexus");
exports.CodeGenTypeEnum = (0, nexus_1.enumType)({
    name: 'CodeGenType',
    members: ['component', 'componentEmpty', 'e2e', 'e2eExamples'],
});
