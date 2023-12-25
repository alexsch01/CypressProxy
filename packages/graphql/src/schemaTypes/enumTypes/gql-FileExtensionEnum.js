"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileExtensionEnum = void 0;
const nexus_1 = require("nexus");
exports.FileExtensionEnum = (0, nexus_1.enumType)({
    name: 'FileExtensionEnum',
    members: ['js', 'ts', 'jsx', 'tsx'],
});
